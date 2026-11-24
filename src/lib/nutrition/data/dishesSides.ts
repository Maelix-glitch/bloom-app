/**
 * The dish library, slice C — sides, chutneys, raitas, desserts and
 * drinks (71 dishes), hand-authored on the D1 dish model exactly like
 * the proof dishes: every line names a USDA reference food and a gram
 * amount for the WHOLE recipe, and no nutrient value appears anywhere
 * in this file — a dish's numbers exist only as `dishNutrients`
 * computes them, and its patterns only as `dishPatterns` derives them.
 *
 * Authoring notes — what the reference set does and does not hold:
 * - There is NO jaggery in the set, so desserts and the imli chutney
 *   are sweetened with the set's granulated sugar or honey. That is a
 *   substitution of the sweetener only, stated here, never hidden.
 * - There is NO paneer in the set; cottage cheese stands in for it
 *   (the mains library's Shahi Paneer notes the stand-in on its lines).
 * - There is no tea and no coffee in the set, so there is no masala
 *   chai and no filter coffee here — a drink Bloom cannot cost or
 *   compute honestly is not invented.
 * - There is no non-dairy curd in the set, so there is no vegan raita:
 *   every raita below is curd-based and derives accordingly.
 * - Bottle gourd, drumstick, beetroot, pumpkin, raw banana, makhana,
 *   flaxseed and curry leaves are likewise absent from the set, and
 *   dishes built on them were dropped rather than faked.
 * - Water is never a line — it carries no nutrients and is not a
 *   reference food; the methods say where it goes.
 */

import type { Dish } from "../dishes";

export const DISHES_SIDES: Dish[] = [
  /* ------------------------------- sides ------------------------------- */
  {
    id: "dish-bhindi-fry",
    name: { en: "Bhindi Fry", hindi: "भिंडी फ्राई" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169260", grams: 600 }, // okra
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-172337", grams: 35 }, // mustard oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
    ],
    method: [
      "Wash the 600 g okra and dry it completely, any surface water makes it sticky, then cut into 2 cm pieces; slice the 100 g onion.",
      "Heat the 35 g mustard oil until it just smokes and turns paler; take it off the heat for a few seconds.",
      "Add the cumin seeds and let them crackle.",
      "Add the onion and fry 3-4 minutes until softening, then add the okra in a single layer.",
      "Cook uncovered on medium heat for 12-15 minutes, stirring rarely, until the okra is tender and the stickiness is gone.",
      "Add turmeric, cayenne and salt and toss for a minute.",
      "Finish with a squeeze of lemon and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-baingan-masala",
    name: { en: "Baingan Masala", hindi: "बैंगन मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 550 }, // eggplant
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomato
      { foodId: "usda-171410", grams: 30 }, // peanut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds (ground in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 550 g eggplant into chunks and rest them in salted water for 10 minutes; drain and pat dry.",
      "Grind the coriander seeds coarsely.",
      "Heat the 30 g peanut oil; add mustard seeds and let them crackle, then cumin, garlic and ginger.",
      "Add the 150 g onion and cook until golden.",
      "Add the 200 g tomato, turmeric, ground coriander, cayenne and salt, and cook until the oil glistens.",
      "Add the eggplant with a splash of water, cover, and cook 12-15 minutes, stirring now and then, until soft and glossy.",
      "Finish with the coriander leaves and rest 5 minutes before serving.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-gajar-matar",
    name: { en: "Gajar Matar", hindi: "गाजर मटर" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2258586", grams: 400 }, // carrot
      { foodId: "usda-170419", grams: 300 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 400 g carrots into small batons.",
      "Grind the coriander seeds coarsely.",
      "Melt the 20 g ghee; add the cumin and let it sizzle, then the ginger and green chilli.",
      "Add the 100 g onion and cook until soft; stir in turmeric and ground coriander.",
      "Add the carrots with a splash of water, cover and cook 6 minutes; add the 300 g peas and salt and cook 4-5 minutes more, until both are tender.",
      "Finish with the coriander leaves and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-beans-poriyal",
    name: { en: "Beans Poriyal", hindi: "बीन्स पोरियाल" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346400", grams: 500 }, // green beans
      { foodId: "usda-170169", grams: 40 }, // coconut (grated in the method)
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170106", grams: 3 }, // red chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Trim the 500 g beans and chop them into 1 cm pieces.",
      "Grate the 40 g coconut.",
      "Heat the 15 g coconut oil; add the mustard seeds and let them crackle, then the dried red chilli.",
      "Add the beans, turmeric and salt with a splash of water.",
      "Cover and cook 7-8 minutes until just tender, the beans should stay bright green.",
      "Stir in the grated coconut, cook 1 minute more, and serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-cabbage-poriyal",
    name: { en: "Cabbage Poriyal", hindi: "पत्तागोभी पोरियाल" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346407", grams: 600 }, // cabbage
      { foodId: "usda-170169", grams: 40 }, // coconut (grated in the method)
      { foodId: "usda-330458", grams: 15 }, // coconut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Shred the 600 g cabbage finely; slit the green chilli.",
      "Grate the 40 g coconut.",
      "Heat the 15 g coconut oil; add mustard seeds and let them crackle, then the ginger and green chilli.",
      "Add the cabbage, turmeric and salt; toss well.",
      "Cover and cook 6-8 minutes, stirring twice, until wilted but still bright.",
      "Fold in the grated coconut and serve at once.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-aloo-beans",
    name: { en: "Aloo Beans", hindi: "आलू बीन्स" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-2346400", grams: 300 }, // green beans
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 400 g potato into small cubes and the 300 g beans into 2 cm pieces.",
      "Grind the coriander seeds coarsely.",
      "Heat the 25 g mustard oil until it just smokes and turns paler; take it off the heat briefly.",
      "Add the cumin and let it crackle.",
      "Add the 100 g onion and cook until golden at the edges; add the potato, turmeric, ground coriander, cayenne and salt.",
      "Cover and cook on low heat for 10 minutes; add the beans and cook 6-8 minutes more until both are tender.",
      "Finish with the coriander leaves and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-karela-fry",
    name: { en: "Karela Fry", hindi: "करेला फ्राई" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168393", grams: 500 }, // bitter gourd
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-172337", grams: 35 }, // mustard oil
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-171323", grams: 2 }, // fennel seeds
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
    ],
    method: [
      "Scrape the 500 g bitter gourd lightly, slice into thin rounds, rub with the salt and rest 20 minutes.",
      "Squeeze out the bitter juice and pat the slices dry.",
      "Heat the 35 g mustard oil until it just smokes and turns paler; add the fennel seeds.",
      "Add the bitter gourd in a single layer and fry, stirring now and then, for 12-15 minutes until crisp at the edges.",
      "Add the 200 g onion, turmeric and cayenne and fry 5 minutes more until the onion caramelises.",
      "Finish with a squeeze of lemon and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-palak-saag",
    name: { en: "Palak Saag", hindi: "पालक साग" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168462", grams: 600 }, // spinach
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 20 }, // mustard oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
    ],
    method: [
      "Wash the 600 g spinach well and chop it roughly, stalks and all.",
      "Heat the 20 g mustard oil; add the cumin, then the garlic and green chilli, and fry until the garlic is golden.",
      "Add the 100 g onion and cook until soft.",
      "Add the 100 g tomato and turmeric and cook until the tomato melts.",
      "Add the spinach and salt; it will collapse in 3-4 minutes. Cook uncovered until the liquid dries, about 5 minutes more.",
      "Finish with a squeeze of lemon and serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-sookhi-gobi-masala",
    name: { en: "Sookhi Gobi Masala", hindi: "सूखी गोबी मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685573", grams: 650 }, // cauliflower
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds (ground in the method)
      { foodId: "usda-170924", grams: 3 }, // curry powder
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 650 g cauliflower into florets.",
      "Grind the coriander seeds coarsely.",
      "Heat the 25 g oil; add the cumin, ginger and garlic and fry for a minute.",
      "Add the 100 g onion and cook until golden.",
      "Add the 150 g tomato, turmeric, ground coriander, curry powder and salt and cook until the oil glistens.",
      "Add the cauliflower with a splash of water, cover, and cook 12-14 minutes until tender but holding its shape; finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-broccoli-masala",
    name: { en: "Broccoli Masala", hindi: "ब्रोकली मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-321900", grams: 600 }, // broccoli
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171413", grams: 20 }, // olive oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the 600 g broccoli into small florets and slice the stalks thinly.",
      "Heat the 20 g olive oil; add the cumin and garlic and fry until fragrant.",
      "Add the 100 g onion and cook until soft.",
      "Add the 100 g tomato and cayenne and cook until the tomato softens.",
      "Add the broccoli and salt with a splash of water; cover and steam 5-6 minutes until bright green and just tender.",
      "Finish with a squeeze of lemon and serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mixed-veg-dry",
    name: { en: "Mixed Veg Dry", hindi: "मिक्स वेज सब्ज़ी" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-170419", grams: 150 }, // green peas
      { foodId: "usda-2685573", grams: 150 }, // cauliflower
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-170924", grams: 2 }, // curry powder
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut all the vegetables into small, even pieces.",
      "Grind the coriander seeds coarsely.",
      "Heat the 25 g oil; add the cumin and let it crackle, then the 100 g onion, and cook until golden.",
      "Add the potato and carrot with turmeric, ground coriander, curry powder and salt; cover and cook 6 minutes.",
      "Add the cauliflower, beans and peas with a splash of water; cover and cook 7-8 minutes until everything is tender.",
      "Finish with the coriander leaves and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-aloo-fry",
    name: { en: "Aloo Fry", hindi: "आलू फ्राई" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 700 }, // potato
      { foodId: "usda-172337", grams: 30 }, // mustard oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170924", grams: 2 }, // curry powder
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 700 g potatoes into wedges or thick fries and pat them dry.",
      "Heat the 30 g mustard oil until it just smokes and turns paler; take it off the heat briefly.",
      "Add the mustard seeds and cumin and let them crackle.",
      "Add the potatoes in a single layer; leave them undisturbed for 5 minutes to crisp.",
      "Turn, add turmeric, cayenne, curry powder and salt, and fry 10-12 minutes more, turning now and then, until golden and tender.",
      "Scatter over the coriander leaves and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-shakarkandi-masala",
    name: { en: "Shakarkandi Masala", hindi: "शकरकंदी मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346404", grams: 700 }, // sweet potato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Peel the 700 g sweet potatoes and cut them into 2 cm chunks.",
      "Heat the 20 g coconut oil; add the cumin and let it crackle.",
      "Add the 100 g onion and cook until golden.",
      "Add the sweet potato, cinnamon, cayenne and salt with a splash of water.",
      "Cover and cook on low heat for 15-18 minutes, stirring gently now and then, until tender and caramelised at the edges.",
      "Finish with a squeeze of lemon and the coriander leaves; serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mushroom-pepper-fry",
    name: { en: "Mushroom Pepper Fry", hindi: "मशरूम काली मिर्च फ्राई" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-1750347", grams: 500 }, // mushrooms
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170108", grams: 100 }, // red pepper
      { foodId: "usda-170427", grams: 100 }, // green pepper
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170931", grams: 3 }, // black pepper (crushed in the method)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
    ],
    method: [
      "Slice the 500 g mushrooms thickly and cut the peppers into strips.",
      "Crush the black pepper coarsely.",
      "Heat the 25 g oil in a wide pan; add the cumin and garlic and fry for a minute.",
      "Add the mushrooms on high heat and fry 5-6 minutes until they give up their water and brown.",
      "Add the 100 g onion and peppers and stir-fry 3-4 minutes until just soft.",
      "Add the crushed pepper and salt, toss, and finish with a squeeze of lemon; serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-lobia-usal",
    name: { en: "Lobia Usal", hindi: "लोबिया उसल" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-173758", grams: 200 }, // cowpeas (lobia), dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171410", grams: 20 }, // peanut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170169", grams: 20 }, // coconut (grated in the method)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the 200 g cowpeas overnight; pressure-cook in fresh water for 3 whistles (or simmer 35 minutes) until tender; keep the cooking water.",
      "Grate the 20 g coconut.",
      "Heat the 20 g peanut oil; add mustard seeds and cumin and let them crackle, then garlic and ginger.",
      "Add the 100 g onion and cook until golden.",
      "Add the 100 g tomato, turmeric and chilli powder and cook until the oil glistens.",
      "Add the cowpeas with their water and the salt; simmer 8-10 minutes until the gravy thickens slightly.",
      "Finish with the grated coconut and coriander leaves; serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-sookha-chana",
    name: { en: "Sookha Chana", hindi: "सूखा चना" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2644282", grams: 200 }, // chickpeas, dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 4 }, // coriander seeds (ground in the method)
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the 200 g chickpeas overnight; pressure-cook in fresh water for 4-5 whistles (or simmer 45 minutes) until tender; drain.",
      "Grind the coriander seeds coarsely.",
      "Heat the 20 g oil; add the cumin and ginger and fry for a minute.",
      "Add the 100 g onion and cook until golden.",
      "Add the 100 g tomato, turmeric, ground coriander, cayenne and salt and cook until the oil glistens.",
      "Add the chickpeas with a splash of water and cook 6-8 minutes, lightly mashing a few, until dry and well coated.",
      "Finish with lemon juice and the coriander leaves; serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker", "mixer_grinder"],
  },
  {
    id: "dish-masala-corn",
    name: { en: "Masala Corn", hindi: "मसाला कॉर्न" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710826", grams: 500 }, // sweet corn
      { foodId: "usda-173410", grams: 15 }, // butter
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-167746", grams: 25 }, // lemon (for its juice)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Boil or steam the 500 g corn kernels for 4-5 minutes until tender; drain.",
      "Melt the 15 g butter in a pan.",
      "Add the 50 g onion and green chilli and fry 2 minutes until softening.",
      "Add the corn, black pepper and salt.",
      "Toss on high heat for 2-3 minutes until glossy and lightly charred at the edges.",
      "Finish with lemon juice and the coriander leaves; serve hot.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-shimla-mirch-masala",
    name: { en: "Shimla Mirch Masala", hindi: "शिमला मिर्च मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170427", grams: 400 }, // green pepper
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171410", grams: 25 }, // peanut oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the peppers into squares and slice the 150 g onion thickly.",
      "Grind the coriander seeds coarsely.",
      "Heat the 25 g peanut oil; add the cumin and let it crackle.",
      "Add the onion and fry until softening.",
      "Add the 100 g tomato, turmeric, ground coriander, cayenne and salt and cook until the tomato melts.",
      "Add the peppers, cover, and cook 8-10 minutes until tender but still holding their shape; finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-onion-tomato-masala",
    name: { en: "Onion-Tomato Masala", hindi: "प्याज़-टमाटर मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-790646", grams: 400 }, // onion
      { foodId: "usda-170457", grams: 400 }, // tomato
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170497", grams: 8 }, // green chilli
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 4 }, // coriander seeds (ground in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Slice the 400 g onions and chop the 400 g tomatoes.",
      "Grind the coriander seeds coarsely.",
      "Heat the 30 g oil; add the cumin, ginger, garlic and green chilli and fry for a minute.",
      "Add the onions and cook slowly for 10-12 minutes until deep golden.",
      "Add the tomatoes, turmeric, ground coriander, cayenne and salt; cook 8-10 minutes until thick, dark and glossy, the oil glistening at the edges.",
      "Finish with the coriander leaves. Serve as a side, or use as the base of another curry.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-soya-masala",
    name: { en: "Soya Masala", hindi: "सोया मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 150 }, // soybeans, dry
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomato
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170924", grams: 4 }, // curry powder
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Soak the 150 g soybeans overnight; pressure-cook in fresh water for 4 whistles (or simmer 40 minutes) until tender; drain.",
      "Heat the 25 g oil; add the cumin, ginger and garlic and fry for a minute.",
      "Add the 150 g onion and cook until golden.",
      "Add the 150 g tomato, turmeric, curry powder, cayenne and salt and cook until the oil glistens.",
      "Add the soybeans with a splash of water; simmer 8-10 minutes until the masala coats them thickly.",
      "Finish with the coriander leaves and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "pressure_cooker"],
  },
  {
    id: "dish-corn-palak",
    name: { en: "Corn Palak", hindi: "कॉर्न पालक" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168462", grams: 400 }, // spinach
      { foodId: "usda-2710826", grams: 300 }, // sweet corn
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-330458", grams: 20 }, // coconut oil
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
    ],
    method: [
      "Wash the 400 g spinach well and chop it roughly.",
      "Heat the 20 g coconut oil; add the cumin, garlic and green chilli and fry until the garlic is golden.",
      "Add the 100 g onion and cook until soft.",
      "Add the spinach and salt and cook until it collapses, about 4 minutes.",
      "Stir in the 300 g corn and cook 4-5 minutes until the corn is tender and the pan is nearly dry.",
      "Finish with a squeeze of lemon and serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-vangi-masala",
    name: { en: "Vangi Masala", hindi: "वांगी मसाला" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2685577", grams: 600 }, // eggplant
      { foodId: "usda-172430", grams: 40 }, // peanuts (ground in the method)
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171410", grams: 25 }, // peanut oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the 40 g peanuts and grind them coarsely; grind the coriander seeds too.",
      "Cut the 600 g eggplant into chunks and rest in salted water for 10 minutes; drain.",
      "Heat the 25 g peanut oil; add mustard seeds and cumin and let them crackle.",
      "Add the 100 g onion and cook until golden.",
      "Add the 100 g tomato, turmeric, chilli powder, ground coriander and salt and cook until the oil glistens.",
      "Add the eggplant and ground peanuts with a splash of water; cover and cook 12-15 minutes until the eggplant is soft and glossy.",
      "Finish with the coriander leaves and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shahi-mixed-veg",
    name: { en: "Shahi Mixed Veg", hindi: "शाही मिक्स वेज" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 150 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-2515374", grams: 30 }, // cashews (ground in the method)
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-2685573", grams: 100 }, // cauliflower
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-322892", grams: 50 }, // milk
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the vegetables into even pieces; cube the 150 g cottage cheese.",
      "Soak the 30 g cashews in warm water for 15 minutes and grind to a paste with a little water.",
      "Melt the 20 g ghee; add the cardamom and cinnamon, then the ginger and garlic, and fry for a minute.",
      "Add the 100 g onion and cook until golden.",
      "Add the 100 g tomato and turmeric and cook until the oil glistens.",
      "Add the carrot, beans, cauliflower and peas with the salt and a splash of water; cover and cook 8-10 minutes until tender.",
      "Stir in the cashew paste and 50 ml milk; simmer 2 minutes. Fold in the cottage cheese, warm through, and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "Cottage cheese and cashews folded through the vegetables, finished with ghee and a splash of milk, the shahi version of the everyday mixed veg.",
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-aloo-matar-dry",
    name: { en: "Aloo Matar Dry", hindi: "आलू मटर" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-170419", grams: 250 }, // green peas
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-172337", grams: 25 }, // mustard oil
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170922", grams: 3 }, // coriander seeds (ground in the method)
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // fresh coriander leaves
    ],
    method: [
      "Cut the 400 g potato into cubes.",
      "Grind the coriander seeds coarsely.",
      "Heat the 25 g mustard oil until it just smokes and turns paler; take it off the heat briefly.",
      "Add the cumin, ginger and green chilli and let them sizzle.",
      "Add the 100 g onion and cook until golden; add the potato, turmeric, ground coriander and salt, cover, and cook 8 minutes.",
      "Add the 100 g tomato and 250 g peas; cook 6-8 minutes more until the potato is tender and the tomato has melted into a light coating.",
      "Finish with the coriander leaves and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },

  /* ------------------------------ chutneys ------------------------------ */
  {
    id: "dish-coconut-chutney",
    name: { en: "Coconut Chutney", hindi: "नारियल चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170169", grams: 100 }, // coconut
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 8 }, // coconut oil
    ],
    method: [
      "Blend the 100 g coconut, green chilli, ginger and salt with about 100 ml water to a coarse, pourable paste.",
      "Taste and adjust the salt, coconut chutney should be mild and fresh.",
      "Stir in the lemon juice.",
      "Heat the 8 g coconut oil in a small pan.",
      "Add the mustard seeds and let them crackle.",
      "Pour the tempering over the chutney and mix; serve fresh.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-tomato-chutney",
    name: { en: "Tomato Chutney", hindi: "टमाटर चटनी" },
    category: "chutney",
    servings: 6,
    cuisine: "india",
    lines: [
      { foodId: "usda-170457", grams: 250 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172337", grams: 10 }, // mustard oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-170923", grams: 1 }, // cumin seeds
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Heat the 10 g mustard oil until it just smokes and turns paler.",
      "Add the mustard seeds and cumin and let them crackle, then the garlic and dried red chilli.",
      "Add the 50 g onion and cook until soft.",
      "Add the 250 g tomato, turmeric and salt.",
      "Cook on low heat for 12-15 minutes, stirring now and then, until the tomato breaks down thick and the oil glistens.",
      "Stir in the sugar, cook 2 minutes more, and cool before serving.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-peanut-chutney",
    name: { en: "Peanut Chutney", hindi: "मूंगफली चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-172430", grams: 50 }, // peanuts
      { foodId: "usda-170169", grams: 20 }, // coconut
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 8 }, // coconut oil
      { foodId: "usda-170106", grams: 2 }, // red chilli
    ],
    method: [
      "Dry-roast the 50 g peanuts until golden and rub off the skins.",
      "Soak the 10 g tamarind in warm water for 10 minutes and squeeze out the pulp.",
      "Blend the peanuts, 20 g coconut, green chilli, garlic, tamarind pulp and salt with a little water to a coarse paste.",
      "Heat the 8 g coconut oil in a small pan.",
      "Add the mustard seeds and dried red chilli; when the seeds crackle, pour the tempering over the chutney.",
      "Mix and serve fresh.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-onion-chutney",
    name: { en: "Onion Chutney", hindi: "प्याज़ चटनी" },
    category: "chutney",
    servings: 6,
    cuisine: "india",
    lines: [
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-334247", grams: 5 }, // sugar
    ],
    method: [
      "Soak the 15 g tamarind in warm water for 10 minutes and squeeze out the pulp.",
      "Heat the 12 g oil; add the mustard seeds and let them crackle, then the dried red chilli and garlic.",
      "Add the 200 g onion and fry until deep golden, 8-10 minutes.",
      "Add the 80 g tomato and salt and cook until soft.",
      "Cool slightly.",
      "Blend coarsely with the tamarind pulp and sugar; serve fresh.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-lahsun-chutney",
    name: { en: "Lahsun Chutney (Dry Garlic)", hindi: "लहसुन चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-1104647", grams: 50 }, // garlic
      { foodId: "usda-170150", grams: 25 }, // sesame seeds
      { foodId: "usda-170932", grams: 3 }, // cayenne (the dried red chilli)
      { foodId: "usda-172430", grams: 25 }, // peanuts
      { foodId: "usda-170169", grams: 15 }, // coconut
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
    ],
    method: [
      "Dry-roast the 25 g sesame until golden; tip out.",
      "Dry-roast the 25 g peanuts until golden; rub off the skins.",
      "Dry-roast the cumin until fragrant.",
      "Peel the 50 g garlic cloves.",
      "Grind everything with the cayenne, coconut and salt to a coarse, dry powder, no water.",
      "Store in a dry jar; it keeps for weeks.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-dhaniya-chutney",
    name: { en: "Dhaniya Chutney", hindi: "धनिया चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-169997", grams: 80 }, // fresh coriander leaves
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-170497", grams: 6 }, // green chilli
      { foodId: "usda-167746", grams: 25 }, // lemon (for its juice)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-172430", grams: 10 }, // peanuts (roasted in the method)
    ],
    method: [
      "Wash the 80 g coriander well, stalks and all, and shake off the water.",
      "Dry-roast the 10 g peanuts and the cumin until fragrant.",
      "Put the coriander, 60 g tomato, 30 g onion, green chilli, garlic, roasted peanuts and cumin in a blender.",
      "Add the lemon juice, salt and 2-3 spoonfuls of cold water.",
      "Blend in short bursts to a bright green paste, short bursts keep the herbs green.",
      "Taste for salt and lemon; serve fresh.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pudina-dahi-dip",
    name: { en: "Pudina Dahi Dip", hindi: "पुदीना दही डिप" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 180 }, // yogurt (dahi)
      { foodId: "usda-173475", grams: 20 }, // mint leaves
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-167746", grams: 10 }, // lemon (for its juice)
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 180 g yogurt smooth with the salt and lemon juice.",
      "Blend the 20 g mint, 15 g coriander and green chilli with a spoonful of the yogurt to a green paste.",
      "Fold the green paste back through the yogurt.",
      "Finish with the roasted cumin.",
      "Chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-til-chutney",
    name: { en: "Til Chutney", hindi: "तिल चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170150", grams: 45 }, // sesame seeds
      { foodId: "usda-170169", grams: 20 }, // coconut
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170932", grams: 3 }, // cayenne (red chilli powder)
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170929", grams: 1 }, // mustard seeds
      { foodId: "usda-330458", grams: 6 }, // coconut oil
    ],
    method: [
      "Dry-roast the 45 g sesame until it pops and smells nutty; cool.",
      "Soak the 10 g tamarind in warm water for 10 minutes and squeeze out the pulp.",
      "Blend the sesame, 20 g coconut, garlic, cayenne, tamarind pulp and salt with a little water to a thick paste.",
      "Heat the 6 g coconut oil in a small pan.",
      "Add the mustard seeds; when they crackle, pour the tempering over the chutney.",
      "Mix and serve fresh.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shahi-coconut-chutney",
    name: { en: "Shahi Coconut Chutney", hindi: "शाही नारियल चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170169", grams: 70 }, // coconut
      { foodId: "usda-2515374", grams: 20 }, // cashews
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170929", grams: 2 }, // mustard seeds
      { foodId: "usda-330458", grams: 8 }, // coconut oil
    ],
    method: [
      "Soak the 20 g cashews in warm water for 10 minutes; drain.",
      "Blend the 70 g coconut, cashews, green chilli, ginger and salt with about 80 ml water to a smooth, creamy paste.",
      "Stir in the lemon juice.",
      "Heat the 8 g coconut oil in a small pan.",
      "Add the mustard seeds; when they crackle, pour the tempering over the chutney.",
      "Mix and serve fresh.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: true,
    enrichment: "Cashews blended into the coconut make this richer and creamier than the everyday coconut chutney.",
    equipment: ["stove", "mixer_grinder"],
  },

  /* ------------------------------- raitas ------------------------------- */
  {
    id: "dish-boondi-raita",
    name: { en: "Boondi Raita", hindi: "बूंदी रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 60 }, // besan (chickpea flour)
      { foodId: "usda-171025", grams: 15 }, // sunflower oil (what the boondi absorbs)
      { foodId: "usda-2259793", grams: 350 }, // yogurt (dahi)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-173475", grams: 5 }, // mint leaves
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 60 g besan with water to a smooth dropping batter; rest 10 minutes.",
      "Heat the 15 g oil in a kadhai.",
      "Drop the batter through a slotted spoon in small droplets, fry until golden and crisp, and drain.",
      "Soak the boondi in warm water for 2 minutes and squeeze gently.",
      "Whisk the 350 g yogurt with the salt and cumin; fold in the boondi.",
      "Finish with cayenne, mint and coriander leaves. Rest 10 minutes before serving.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-mixed-veg-raita",
    name: { en: "Mixed Veg Raita", hindi: "मिक्स वेज रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (dahi)
      { foodId: "usda-2346406", grams: 80 }, // cucumber
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-2258586", grams: 50 }, // carrot
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
      { foodId: "usda-173475", grams: 5 }, // mint leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 300 g yogurt smooth with the salt.",
      "Chop the 80 g cucumber, 80 g tomato, 50 g onion and 50 g carrot finely.",
      "Squeeze the cucumber lightly so the raita does not water out.",
      "Fold the vegetables through the yogurt.",
      "Finish with the cumin, black pepper, coriander and mint; chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-onion-tomato-raita",
    name: { en: "Onion-Tomato Raita", hindi: "प्याज़-टमाटर रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 350 }, // yogurt (dahi)
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170457", grams: 120 }, // tomato
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 350 g yogurt smooth with the salt.",
      "Chop the 80 g onion and 120 g tomato finely.",
      "Chop the green chilli very fine.",
      "Fold the onion, tomato and chilli through the yogurt.",
      "Finish with the cumin and coriander leaves; chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-fruit-raita",
    name: { en: "Fruit Raita", hindi: "फ्रूट रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (dahi)
      { foodId: "usda-173944", grams: 100 }, // banana
      { foodId: "usda-171688", grams: 80 }, // apple
      { foodId: "usda-174683", grams: 60 }, // grapes
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Crush the cardamom pods and pick out the seeds.",
      "Whisk the 300 g yogurt smooth with the sugar, the salt and half the crushed cardamom.",
      "Slice the 100 g banana and dice the 80 g apple.",
      "Halve the 60 g grapes.",
      "Fold the fruit through the yogurt gently.",
      "Finish with the remaining cardamom and the black pepper; chill well before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-palak-raita",
    name: { en: "Palak Raita", hindi: "पालक रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 350 }, // yogurt (dahi)
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-172337", grams: 5 }, // mustard oil
    ],
    method: [
      "Blanch the 150 g spinach in boiling water for 1 minute; drain, cool and chop finely.",
      "Whisk the 350 g yogurt smooth with the salt.",
      "Fold in the spinach and crushed garlic.",
      "Heat the 5 g mustard oil until it just smokes and turns paler.",
      "Add the cumin and let it crackle; pour the tempering over the raita.",
      "Finish with a dusting of cayenne; chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-aloo-raita",
    name: { en: "Aloo Raita", hindi: "आलू रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (dahi)
      { foodId: "usda-2346401", grams: 200 }, // potato
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
      { foodId: "usda-173475", grams: 5 }, // mint leaves
    ],
    method: [
      "Boil the 200 g potatoes until tender; cool, peel and cut into small cubes.",
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 300 g yogurt smooth with the salt.",
      "Fold in the potato.",
      "Finish with the cumin, cayenne, black pepper, coriander and mint.",
      "Chill before serving.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pineapple-raita",
    name: { en: "Pineapple Raita", hindi: "अनानास रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 350 }, // yogurt (dahi)
      { foodId: "usda-169124", grams: 150 }, // pineapple
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-170923", grams: 1 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-173475", grams: 5 }, // mint leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 350 g yogurt smooth with the sugar and salt.",
      "Cut the 150 g pineapple into small pieces.",
      "Fold the pineapple through with its juice.",
      "Finish with the cumin, black pepper and mint.",
      "Chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-burhani-raita",
    name: { en: "Burhani Raita", hindi: "बुरहानी रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 400 }, // yogurt (dahi)
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-173475", grams: 8 }, // mint leaves
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Crush the garlic to a paste with a pinch of the salt.",
      "Whisk the 400 g yogurt smooth with the remaining salt.",
      "Fold in the garlic paste, cumin and black pepper.",
      "Finish with cayenne, torn mint and coriander leaves.",
      "Chill before serving. In Hyderabad this is the raita served with biryani.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-gajar-raita",
    name: { en: "Gajar Raita", hindi: "गाजर रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 350 }, // yogurt (dahi)
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170929", grams: 1 }, // mustard seeds
      { foodId: "usda-330458", grams: 5 }, // coconut oil
      { foodId: "usda-170497", grams: 3 }, // green chilli
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Grate the 150 g carrot coarsely.",
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 350 g yogurt smooth with the salt; fold in the carrot and cumin.",
      "Heat the 5 g coconut oil in a small pan.",
      "Add the mustard seeds and green chilli; when the seeds crackle, pour the tempering over the raita.",
      "Finish with the coriander leaves; chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-greek-yogurt-raita",
    name: { en: "Greek Yogurt Raita", hindi: "ग्रीक दही रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-330137", grams: 350 }, // Greek yogurt
      { foodId: "usda-2346406", grams: 120 }, // cucumber
      { foodId: "usda-173475", grams: 8 }, // mint leaves
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-1104647", grams: 4 }, // garlic
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-171413", grams: 8 }, // olive oil
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 350 g Greek yogurt smooth with the salt and the grated garlic.",
      "Grate the 120 g cucumber.",
      "Squeeze out the excess water from the cucumber.",
      "Fold the cucumber through with the torn mint.",
      "Finish with the cumin and the 8 g olive oil drizzled over; chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: true,
    enrichment: "Greek yogurt instead of plain curd, finished with a drizzle of olive oil, a thicker, higher-protein raita.",
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-corn-raita",
    name: { en: "Corn Raita", hindi: "कॉर्न रायता" },
    category: "raita",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 350 }, // yogurt (dahi)
      { foodId: "usda-2710826", grams: 150 }, // sweet corn
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
      { foodId: "usda-170497", grams: 3 }, // green chilli
    ],
    method: [
      "Boil or steam the 150 g corn for 4 minutes; drain and cool.",
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the 350 g yogurt smooth with the salt.",
      "Fold in the corn and the finely chopped green chilli.",
      "Finish with the cumin, black pepper and coriander leaves.",
      "Chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },

  /* ------------------------------ desserts ------------------------------ */
  {
    id: "dish-fruit-salad-spiced-yogurt",
    name: { en: "Fruit Salad with Spiced Yogurt", hindi: "मसालेदार दही फ्रूट सलाद" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-173944", grams: 150 }, // banana
      { foodId: "usda-171688", grams: 150 }, // apple
      { foodId: "usda-169910", grams: 150 }, // mango
      { foodId: "usda-174683", grams: 100 }, // grapes
      { foodId: "usda-327699", grams: 100 }, // strawberries
      { foodId: "usda-2259793", grams: 200 }, // yogurt (dahi)
      { foodId: "usda-169640", grams: 20 }, // honey
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-170931", grams: 1 }, // black pepper
    ],
    method: [
      "Crush the cardamom pods and pick out the seeds.",
      "Whisk the 200 g yogurt with the honey, crushed cardamom and black pepper; chill.",
      "Cut the banana, apple and mango into bite-sized pieces.",
      "Halve the grapes and strawberries.",
      "Fold the fruit through the spiced yogurt just before serving, so the fruit stays fresh.",
      "Serve chilled in small bowls.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },

  /* ------------------------------- drinks ------------------------------- */
  {
    id: "dish-masala-chaas",
    name: { en: "Masala Chaas", hindi: "मसाला छाछ" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 200 }, // yogurt (dahi)
      { foodId: "usda-170923", grams: 1 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-173475", grams: 5 }, // mint leaves
      { foodId: "usda-169997", grams: 5 }, // fresh coriander leaves
      { foodId: "usda-169231", grams: 3 }, // ginger
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Grate the ginger.",
      "Blend or whisk the 200 g yogurt with about 300 ml cold water until frothy.",
      "Stir in the salt, cumin, black pepper and ginger.",
      "Tear the mint and coriander leaves and stir them in.",
      "Serve chilled, in tall glasses.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-sweet-lassi",
    name: { en: "Sweet Lassi", hindi: "मीठी लस्सी" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (dahi)
      { foodId: "usda-322892", grams: 100 }, // milk
      { foodId: "usda-334247", grams: 25 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
    ],
    method: [
      "Crush the cardamom pods and pick out the seeds.",
      "Powder the cardamom seeds with a little of the sugar.",
      "Blend the 300 g yogurt, 100 ml milk, sugar and cardamom.",
      "Blend until smooth and frothy.",
      "Pour into glasses, keeping the froth on top.",
      "Serve chilled.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["mixer_grinder", "fridge"],
    noCook: true,
  },
  {
    id: "dish-namkeen-lassi",
    name: { en: "Namkeen Lassi", hindi: "नमकीन लस्सी" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 300 }, // yogurt (dahi)
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170923", grams: 1 }, // cumin seeds (roasted in the method)
      { foodId: "usda-173475", grams: 5 }, // mint leaves
      { foodId: "usda-170931", grams: 1 }, // black pepper
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Blend the 300 g yogurt with about 150 ml cold water and the salt.",
      "Blend until smooth and frothy.",
      "Pour into glasses.",
      "Finish with the cumin and black pepper.",
      "Tear the mint leaves over and serve chilled.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-mango-lassi",
    name: { en: "Mango Lassi", hindi: "मैंगो लस्सी" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-169910", grams: 200 }, // mango
      { foodId: "usda-2259793", grams: 250 }, // yogurt (dahi)
      { foodId: "usda-322892", grams: 50 }, // milk
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
    ],
    method: [
      "Peel the 200 g mango and cut the flesh from the stone.",
      "Crush the cardamom pods and pick out the seeds.",
      "Blend the mango with the 250 g yogurt and 50 ml milk.",
      "Add the 15 g sugar and crushed cardamom.",
      "Blend until completely smooth and frothy.",
      "Serve chilled at once.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder", "fridge"],
    noCook: true,
  },
  {
    id: "dish-haldi-doodh",
    name: { en: "Haldi Doodh", hindi: "हल्दी दूध" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-169640", grams: 15 }, // honey
      { foodId: "usda-169231", grams: 3 }, // ginger
    ],
    method: [
      "Grate the ginger.",
      "Warm the 400 ml milk in a small pan, do not boil it hard.",
      "Whisk in the turmeric, cinnamon, black pepper and ginger.",
      "Simmer gently for 3-4 minutes until steaming and deep yellow.",
      "Take off the heat; stir in the honey.",
      "Strain into mugs and serve hot.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-badam-doodh",
    name: { en: "Badam Doodh", hindi: "बादाम दूध" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-322892", grams: 350 }, // milk
      { foodId: "usda-2346393", grams: 20 }, // almonds
      { foodId: "usda-2515374", grams: 5 }, // cashews
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-172231", grams: 1 }, // turmeric
    ],
    method: [
      "Soak the 20 g almonds and 5 g cashews in warm water for 15 minutes; drain.",
      "Blend the nuts to a smooth paste with a little of the milk.",
      "Warm the rest of the 350 ml milk in a pan.",
      "Whisk in the nut paste, turmeric, cinnamon and crushed cardamom.",
      "Simmer gently for 5 minutes, stirring, until slightly thickened.",
      "Stir in the sugar; serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "Almonds and cashews blended into the milk make this the enriched, festive milk, richer than the everyday haldi doodh.",
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pudina-chaas",
    name: { en: "Pudina Chaas", hindi: "पुदीना छाछ" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2259793", grams: 200 }, // yogurt (dahi)
      { foodId: "usda-173475", grams: 15 }, // mint leaves
      { foodId: "usda-170497", grams: 2 }, // green chilli
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170923", grams: 1 }, // cumin seeds (roasted in the method)
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Blend the 200 g yogurt with the 15 g mint, coriander and green chilli until pale green.",
      "Whisk in about 300 ml cold water.",
      "Add the salt and whisk until frothy.",
      "Pour into tall glasses.",
      "Serve chilled, finished with the roasted cumin.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
];
