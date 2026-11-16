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
 *   (the shahi paneer-style side says so in its enrichment text).
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
      "Wash the okra and dry it completely — any surface water makes it sticky — then cut into 2 cm pieces; slice the onion.",
      "Heat the mustard oil until it just smokes; add the cumin seeds and let them crackle.",
      "Add the onion and fry 3–4 minutes until softening, then add the okra in a single layer.",
      "Cook uncovered on medium heat for 12–15 minutes, stirring rarely, until the okra is tender and the stickiness is gone.",
      "Add turmeric, cayenne and salt, toss for a minute, and finish with a squeeze of lemon.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
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
      "Cut the eggplant into chunks and rest them in salted water for 10 minutes; drain and pat dry. Grind the coriander seeds coarsely.",
      "Heat the peanut oil; add mustard seeds and let them crackle, then cumin, garlic and ginger.",
      "Add the onion and cook until golden; add tomato, turmeric, ground coriander, cayenne and salt, and cook until the oil glistens.",
      "Add the eggplant with a splash of water, cover, and cook 12–15 minutes, stirring now and then, until soft and glossy.",
      "Finish with the coriander leaves and rest 5 minutes before serving.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
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
      "Cut the carrots into small batons; grind the coriander seeds coarsely.",
      "Melt the ghee, add the cumin and let it sizzle, then add ginger and green chilli.",
      "Add the onion and cook until soft; stir in turmeric and ground coriander.",
      "Add the carrots with a splash of water, cover and cook 6 minutes; add the peas and salt and cook 4–5 minutes more, until both are tender.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
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
      "Trim the beans and chop them into 1 cm pieces; grate the coconut.",
      "Heat the coconut oil; add the mustard seeds and let them crackle, then the red chilli.",
      "Add the beans, turmeric and salt with a splash of water; cover and cook 7–8 minutes until just tender.",
      "Stir in the grated coconut, cook 1 minute more, and serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Shred the cabbage finely; slit the green chilli; grate the coconut.",
      "Heat the coconut oil; add mustard seeds and let them crackle, then the ginger and green chilli.",
      "Add the cabbage, turmeric and salt; toss well, cover, and cook 6–8 minutes, stirring twice, until wilted but still bright.",
      "Fold in the grated coconut and serve at once.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
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
      "Cut the potato into small cubes and the beans into 2 cm pieces; grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes; add the cumin and let it crackle.",
      "Add the onion and cook until golden at the edges; add the potato, turmeric, ground coriander, cayenne and salt.",
      "Cover and cook on low heat for 10 minutes; add the beans and cook 6–8 minutes more until both are tender.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
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
      "Scrape the bitter gourd lightly, slice into thin rounds, rub with the salt and rest 20 minutes; squeeze out the bitter juice and pat dry.",
      "Heat the mustard oil until it just smokes; add the fennel seeds.",
      "Add the bitter gourd in a single layer and fry, stirring now and then, for 12–15 minutes until crisp at the edges.",
      "Add the onion, turmeric and cayenne and fry 5 minutes more until the onion caramelises.",
      "Finish with a squeeze of lemon.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
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
      "Wash the spinach well and chop it roughly, stalks and all.",
      "Heat the mustard oil; add the cumin, then the garlic and green chilli, and fry until the garlic is golden.",
      "Add the onion and cook until soft; add the tomato and turmeric and cook until the tomato melts.",
      "Add the spinach and salt; it will collapse in 3–4 minutes. Cook uncovered until the liquid dries, about 5 minutes more.",
      "Finish with a squeeze of lemon.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Cut the cauliflower into florets; grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, ginger and garlic and fry for a minute.",
      "Add the onion and cook until golden; add the tomato, turmeric, ground coriander, curry powder and salt and cook until the oil glistens.",
      "Add the cauliflower with a splash of water, cover, and cook 12–14 minutes until tender but holding its shape.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
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
      "Cut the broccoli into small florets and slice the stalks thinly.",
      "Heat the olive oil; add the cumin and garlic and fry until fragrant.",
      "Add the onion and cook until soft; add the tomato and cayenne and cook until the tomato softens.",
      "Add the broccoli and salt with a splash of water; cover and steam 5–6 minutes until bright green and just tender.",
      "Finish with a squeeze of lemon.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Cut all the vegetables into small, even pieces; grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin and let it crackle, then the onion, and cook until golden.",
      "Add the potato and carrot with turmeric, ground coriander, curry powder and salt; cover and cook 6 minutes.",
      "Add the cauliflower, beans and peas with a splash of water; cover and cook 7–8 minutes until everything is tender.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
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
      "Cut the potatoes into wedges or thick fries and pat them dry.",
      "Heat the mustard oil until it just smokes; add the mustard seeds and cumin and let them crackle.",
      "Add the potatoes in a single layer; leave them undisturbed for 5 minutes to crisp.",
      "Turn, add turmeric, cayenne, curry powder and salt, and fry 10–12 minutes more, turning now and then, until golden and tender.",
      "Scatter over the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
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
      "Peel the sweet potatoes and cut them into 2 cm chunks.",
      "Heat the coconut oil; add the cumin and let it crackle, then the onion, and cook until golden.",
      "Add the sweet potato, cinnamon, cayenne and salt with a splash of water.",
      "Cover and cook on low heat for 15–18 minutes, stirring gently now and then, until tender and caramelised at the edges.",
      "Finish with a squeeze of lemon and the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
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
      "Slice the mushrooms thickly and cut the peppers into strips; crush the black pepper coarsely.",
      "Heat the oil in a wide pan; add the cumin and garlic and fry for a minute.",
      "Add the mushrooms on high heat and fry 5–6 minutes until they give up their water and brown.",
      "Add the onion and peppers and stir-fry 3–4 minutes until just soft.",
      "Add the crushed pepper and salt, toss, and finish with a squeeze of lemon.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-sprouted-moong",
    name: { en: "Sprouted Moong", hindi: "अंकुरित मूंग" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 200 }, // mung beans (sprouted in the method)
      { foodId: "usda-2346406", grams: 150 }, // cucumber
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-167746", grams: 30 }, // lemon (for its juice)
      { foodId: "usda-170497", grams: 5 }, // green chilli
      { foodId: "usda-169997", grams: 15 }, // fresh coriander leaves
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
    ],
    method: [
      "Soak the mung beans overnight, drain, tie in a cloth and leave in a warm place for 12–24 hours until sprouted.",
      "Steam or blanch the sprouts for 3–4 minutes if you prefer them softer; cool.",
      "Dry-roast the cumin and crush it coarsely.",
      "Chop the cucumber, tomato and onion finely; mix with the sprouts, green chilli and coriander leaves.",
      "Dress with lemon juice, the roasted cumin and salt just before serving.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Soak the cowpeas overnight; pressure-cook in fresh water for 3 whistles (or simmer 35 minutes) until tender; keep the cooking water.",
      "Heat the peanut oil; add mustard seeds and cumin and let them crackle, then garlic and ginger.",
      "Add the onion and cook until golden; add tomato, turmeric and chilli powder and cook until the oil glistens.",
      "Add the cowpeas with their water and the salt; simmer 8–10 minutes until the gravy thickens slightly.",
      "Finish with the grated coconut and coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
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
      "Soak the chickpeas overnight; pressure-cook in fresh water for 4–5 whistles (or simmer 45 minutes) until tender; drain.",
      "Heat the oil; add the cumin and ginger and fry for a minute; grind the coriander seeds coarsely.",
      "Add the onion and cook until golden; add the tomato, turmeric, ground coriander, cayenne and salt and cook until the oil glistens.",
      "Add the chickpeas with a splash of water and cook 6–8 minutes, lightly mashing a few, until dry and well coated.",
      "Finish with lemon juice and the coriander leaves.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
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
      "Boil or steam the corn kernels for 4–5 minutes until tender; drain.",
      "Melt the butter in a pan; add the onion and green chilli and fry 2 minutes.",
      "Add the corn, black pepper and salt; toss on high heat for 2–3 minutes.",
      "Finish with lemon juice and the coriander leaves; serve hot.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Cut the peppers into squares and slice the onion thickly; grind the coriander seeds coarsely.",
      "Heat the peanut oil; add the cumin and let it crackle.",
      "Add the onion and fry until softening; add the tomato, turmeric, ground coriander, cayenne and salt and cook until the tomato melts.",
      "Add the peppers, cover, and cook 8–10 minutes until tender but still holding their shape.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
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
      "Slice the onions and chop the tomatoes; grind the coriander seeds coarsely.",
      "Heat the oil; add the cumin, ginger, garlic and green chilli and fry for a minute.",
      "Add the onions and cook slowly for 10–12 minutes until deep golden.",
      "Add the tomatoes, turmeric, ground coriander, cayenne and salt; cook 8–10 minutes until thick, dark and glossy, the oil glistening at the edges.",
      "Finish with the coriander leaves. Serve as a side, or use as the base of another curry.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
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
      "Soak the soybeans overnight; pressure-cook in fresh water for 4 whistles (or simmer 40 minutes) until tender; drain.",
      "Heat the oil; add the cumin, ginger and garlic and fry for a minute.",
      "Add the onion and cook until golden; add the tomato, turmeric, curry powder, cayenne and salt and cook until the oil glistens.",
      "Add the soybeans with a splash of water; simmer 8–10 minutes until the masala coats them thickly.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
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
      "Wash the spinach well and chop it roughly.",
      "Heat the coconut oil; add the cumin, garlic and green chilli and fry until the garlic is golden.",
      "Add the onion and cook until soft; add the spinach and salt and cook until it collapses, about 4 minutes.",
      "Stir in the corn and cook 4–5 minutes until the corn is tender and the pan is nearly dry.",
      "Finish with a squeeze of lemon.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
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
      "Dry-roast the peanuts and grind them coarsely; grind the coriander seeds too. Cut the eggplant into chunks and rest in salted water for 10 minutes; drain.",
      "Heat the peanut oil; add mustard seeds and cumin and let them crackle.",
      "Add the onion and cook until golden; add the tomato, turmeric, chilli powder, ground coriander and salt and cook until the oil glistens.",
      "Add the eggplant and ground peanuts with a splash of water; cover and cook 12–15 minutes until the eggplant is soft and glossy.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
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
      "Cut the vegetables into even pieces; cube the cottage cheese. Soak the cashews in warm water for 15 minutes and grind to a paste with a little water.",
      "Melt the ghee; add the cardamom and cinnamon, then the ginger and garlic, and fry for a minute.",
      "Add the onion and cook until golden; add the tomato and turmeric and cook until the oil glistens.",
      "Add the carrot, beans, cauliflower and peas with the salt and a splash of water; cover and cook 8–10 minutes until tender.",
      "Stir in the cashew paste and milk; simmer 2 minutes. Fold in the cottage cheese, warm through, and finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "Cottage cheese and cashews folded through the vegetables, finished with ghee and a splash of milk — the shahi version of the everyday mixed veg.",
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
      "Cut the potato into cubes; grind the coriander seeds coarsely.",
      "Heat the mustard oil until it just smokes; add the cumin, ginger and green chilli.",
      "Add the onion and cook until golden; add the potato, turmeric, ground coriander and salt, cover, and cook 8 minutes.",
      "Add the tomato and peas; cook 6–8 minutes more until the potato is tender and the tomato has melted into a light coating.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-shahi-paneer-style",
    name: { en: "Shahi Paneer-Style (Cottage Cheese)", hindi: "शाही पनीर" },
    category: "side",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-328841", grams: 250 }, // cottage cheese (paneer stand-in)
      { foodId: "usda-170457", grams: 250 }, // tomato
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2515374", grams: 25 }, // cashews
      { foodId: "usda-171314", grams: 20 }, // ghee
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172231", grams: 1 }, // turmeric
      { foodId: "usda-171319", grams: 2 }, // chilli powder
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 8 }, // fresh coriander leaves
      { foodId: "usda-322892", grams: 50 }, // milk
    ],
    method: [
      "Soak the cashews in warm water for 15 minutes. Blend the tomato, onion, ginger, garlic and cashews to a smooth paste with a little water.",
      "Melt the ghee; add the cinnamon and cardamom, then the paste, turmeric, chilli powder and salt.",
      "Cook the paste on medium heat for 10–12 minutes, stirring often, until thick and glossy and the ghee glistens at the edges.",
      "Add the milk and a splash of water; simmer 2 minutes. Add the cottage cheese cubes and green chilli and warm through gently for 3 minutes — do not boil hard.",
      "Finish with the coriander leaves.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "A cashew-tomato gravy and a ghee finish make this the rich, festive version; cottage cheese stands in for paneer.",
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
      "Blend the coconut, green chilli, ginger and salt with about 100 ml water to a coarse, pourable paste.",
      "Stir in the lemon juice.",
      "Heat the coconut oil in a small pan; add the mustard seeds and let them crackle; pour the tempering over the chutney and mix.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
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
      "Heat the mustard oil; add the mustard seeds and cumin and let them crackle, then the garlic and red chilli.",
      "Add the onion and cook until soft; add the tomato, turmeric and salt.",
      "Cook on low heat for 12–15 minutes, stirring now and then, until the tomato breaks down thick and the oil glistens.",
      "Stir in the sugar, cook 2 minutes more, and cool before serving.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
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
      "Dry-roast the peanuts until golden and rub off the skins.",
      "Soak the tamarind in warm water for 10 minutes and squeeze out the pulp.",
      "Blend the peanuts, coconut, green chilli, garlic, tamarind pulp and salt with a little water to a coarse paste.",
      "Heat the coconut oil; add the mustard seeds and red chilli; when the seeds crackle, pour the tempering over the chutney.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-imli-chutney",
    name: { en: "Imli Chutney", hindi: "इमली चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-167763", grams: 60 }, // tamarind
      { foodId: "usda-334247", grams: 50 }, // sugar (the set has no jaggery — see header)
      { foodId: "usda-170923", grams: 2 }, // cumin seeds (roasted in the method)
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Soak the tamarind in 250 ml warm water for 15 minutes; squeeze and strain the pulp.",
      "Dry-roast the cumin and crush it coarsely.",
      "Simmer the tamarind pulp with the sugar, grated ginger, cayenne and salt for 8–10 minutes until it thickens to a pouring sauce.",
      "Stir in the roasted cumin; cool — it thickens further as it cools.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Soak the tamarind in warm water for 10 minutes and squeeze out the pulp.",
      "Heat the oil; add the mustard seeds and let them crackle, then the red chilli and garlic.",
      "Add the onion and fry until deep golden; add the tomato and salt and cook until soft.",
      "Cool slightly, then blend coarsely with the tamarind pulp and sugar.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Dry-roast the sesame, peanuts and cumin separately until fragrant and golden; cool.",
      "Peel the garlic cloves.",
      "Grind everything with the cayenne and salt to a coarse, dry powder — no water.",
      "Store in a dry jar; it keeps for weeks.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
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
      "Wash the coriander well, stalks and all, and shake off the water.",
      "Dry-roast the peanuts and the cumin.",
      "Blend everything with the lemon juice and 2–3 spoonfuls of cold water to a bright green paste — short bursts, so the herbs stay green.",
      "Taste for salt and lemon; serve fresh.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
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
      "Whisk the yogurt smooth with the salt and lemon juice.",
      "Blend the mint, coriander and green chilli with a spoonful of the yogurt, then fold the green paste back through.",
      "Finish with the roasted cumin; chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-chilli-garlic-oil",
    name: { en: "Chilli-Garlic Oil", hindi: "मिर्च-लहसुन तेल" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-171016", grams: 35 }, // sesame oil
      { foodId: "usda-1104647", grams: 30 }, // garlic
      { foodId: "usda-170932", grams: 4 }, // cayenne (red chilli powder)
      { foodId: "usda-171319", grams: 3 }, // chilli powder
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Slice the garlic thinly. Dry-roast the sesame seeds until golden.",
      "Heat the sesame oil gently; fry the garlic on low heat until pale gold — do not let it brown.",
      "Take off the heat; stir in the cayenne, chilli powder, sesame seeds and salt.",
      "Cool and store in a jar; spoon over rice, noodles or grilled vegetables.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Dry-roast the sesame until it pops and smells nutty; cool.",
      "Soak the tamarind in warm water for 10 minutes and squeeze out the pulp.",
      "Blend the sesame, coconut, garlic, cayenne, tamarind pulp and salt with a little water to a thick paste.",
      "Heat the coconut oil; add the mustard seeds; when they crackle, pour the tempering over the chutney.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-mango-chutney",
    name: { en: "Mango Chutney", hindi: "आम की चटनी" },
    category: "chutney",
    servings: 6,
    cuisine: "india",
    lines: [
      { foodId: "usda-169910", grams: 250 }, // mango
      { foodId: "usda-334247", grams: 40 }, // sugar
      { foodId: "usda-173469", grams: 15 }, // cider vinegar
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-170932", grams: 1 }, // cayenne (red chilli powder)
      { foodId: "usda-171320", grams: 1 }, // cinnamon
      { foodId: "usda-171321", grams: 1 }, // cloves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Peel the mango and cut the flesh into small cubes; grate the ginger.",
      "Put everything in a pan with 100 ml water; bring to a simmer.",
      "Cook on low heat for 20–25 minutes, stirring now and then, until thick and jammy and the mango is soft.",
      "Cool and store in a clean jar in the fridge.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-magaj-chutney",
    name: { en: "Sunflower Seed Chutney", hindi: "सूरजमुखी के बीज की चटनी" },
    category: "chutney",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2515381", grams: 45 }, // sunflower seeds
      { foodId: "usda-170169", grams: 25 }, // coconut
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170929", grams: 1 }, // mustard seeds
      { foodId: "usda-171025", grams: 6 }, // sunflower oil
    ],
    method: [
      "Dry-roast the sunflower seeds until lightly golden; cool.",
      "Blend the seeds, coconut, green chilli, garlic and salt with a little water to a thick paste; stir in the lemon juice.",
      "Heat the oil; add the mustard seeds; when they crackle, pour the tempering over the chutney.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Soak the cashews in warm water for 10 minutes; drain.",
      "Blend the coconut, cashews, green chilli, ginger and salt with about 80 ml water to a smooth, creamy paste.",
      "Stir in the lemon juice.",
      "Heat the coconut oil; add the mustard seeds; when they crackle, pour the tempering over the chutney.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: true,
    enrichment: "Cashews blended into the coconut make this richer and creamier than the everyday coconut chutney.",
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
      "Whisk the besan with water to a smooth dropping batter; rest 10 minutes.",
      "Heat the oil in a kadhai; drop the batter through a slotted spoon in small droplets, fry until golden and crisp, and drain.",
      "Soak the boondi in warm water for 2 minutes and squeeze gently.",
      "Whisk the yogurt with the salt and cumin; fold in the boondi; finish with cayenne, mint and coriander leaves. Rest 10 minutes before serving.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
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
      "Whisk the yogurt smooth with the salt.",
      "Chop the cucumber, tomato, onion and carrot finely; squeeze the cucumber lightly.",
      "Fold the vegetables through the yogurt; finish with the cumin, black pepper, coriander and mint. Chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Whisk the yogurt smooth with the salt.",
      "Chop the onion and tomato finely and the green chilli very fine; fold them through the yogurt.",
      "Finish with the cumin and coriander leaves; chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Whisk the yogurt smooth with the sugar, the salt and half the crushed cardamom.",
      "Slice the banana, dice the apple and halve the grapes.",
      "Fold the fruit through the yogurt gently.",
      "Finish with the remaining cardamom and the black pepper; chill well before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Blanch the spinach in boiling water for 1 minute; drain, cool and chop finely.",
      "Whisk the yogurt smooth with the salt; fold in the spinach and crushed garlic.",
      "Heat the mustard oil; add the cumin and let it crackle; pour the tempering over the raita.",
      "Finish with a dusting of cayenne; chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Boil the potatoes until tender; cool, peel and cut into small cubes.",
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the yogurt smooth with the salt; fold in the potato.",
      "Finish with the cumin, cayenne, black pepper, coriander and mint; chill before serving.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
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
      "Whisk the yogurt smooth with the sugar and salt.",
      "Cut the pineapple into small pieces and fold it through with its juice.",
      "Finish with the cumin, black pepper and mint; chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Dry-roast the cumin and crush it coarsely; crush the garlic to a paste with a pinch of the salt.",
      "Whisk the yogurt smooth with the remaining salt.",
      "Fold in the garlic paste, cumin and black pepper.",
      "Finish with cayenne, torn mint and coriander leaves; chill before serving. In Hyderabad this is the raita served with biryani.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Grate the carrot coarsely. Dry-roast the cumin and crush it.",
      "Whisk the yogurt smooth with the salt; fold in the carrot and cumin.",
      "Heat the coconut oil; add the mustard seeds and green chilli; when the seeds crackle, pour the tempering over the raita.",
      "Finish with the coriander leaves; chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
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
      "Whisk the Greek yogurt smooth with the salt and the grated garlic.",
      "Grate the cucumber, squeeze out the excess water, and fold it through with the torn mint.",
      "Finish with the cumin and the olive oil drizzled over; chill before serving.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: true,
    enrichment: "Greek yogurt instead of plain curd, finished with a drizzle of olive oil — a thicker, higher-protein raita.",
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
      "Boil or steam the corn for 4 minutes; drain and cool.",
      "Dry-roast the cumin and crush it coarsely.",
      "Whisk the yogurt smooth with the salt; fold in the corn and the finely chopped green chilli.",
      "Finish with the cumin, black pepper and coriander leaves; chill before serving.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
  },

  /* ------------------------------ desserts ------------------------------ */
  {
    id: "dish-rice-kheer",
    name: { en: "Rice Kheer", hindi: "चावल की खीर" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 60 }, // white rice
      { foodId: "usda-322892", grams: 800 }, // milk
      { foodId: "usda-334247", grams: 60 }, // sugar (the set has no jaggery — see header)
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 15 }, // almonds
      { foodId: "usda-2515374", grams: 10 }, // cashews
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain and crush it lightly.",
      "Bring the milk to a boil in a heavy pan; add the rice.",
      "Simmer on low heat for 30–35 minutes, stirring often and scraping the base, until the rice is soft and the milk has thickened.",
      "Add the sugar and crushed cardamom; simmer 5 minutes more.",
      "Serve warm or chilled, topped with slivered almonds and cashews.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-sooji-halwa",
    name: { en: "Sooji Halwa", hindi: "सूजी का हलवा" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168933", grams: 150 }, // semolina (sooji)
      { foodId: "usda-171314", grams: 45 }, // ghee
      { foodId: "usda-334247", grams: 80 }, // sugar
      { foodId: "usda-322892", grams: 100 }, // milk
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2515374", grams: 15 }, // cashews
      { foodId: "usda-2346393", grams: 10 }, // almonds
    ],
    method: [
      "Heat the ghee; fry the cashews and almonds until golden; lift out.",
      "In the same ghee, roast the semolina on low heat for 8–10 minutes, stirring constantly, until golden and nutty-smelling.",
      "Warm the milk with 250 ml water. Pour it into the semolina slowly, stirring fast so no lumps form.",
      "Add the sugar and crushed cardamom; stir until the halwa thickens and leaves the sides of the pan, about 3–4 minutes.",
      "Serve hot, topped with the fried nuts.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-gajar-halwa",
    name: { en: "Gajar Halwa", hindi: "गाजर का हलवा" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2258586", grams: 600 }, // carrot
      { foodId: "usda-322892", grams: 400 }, // milk
      { foodId: "usda-171314", grams: 30 }, // ghee
      { foodId: "usda-334247", grams: 70 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 15 }, // almonds
      { foodId: "usda-2515374", grams: 15 }, // cashews
    ],
    method: [
      "Grate the carrots coarsely.",
      "Cook the carrots in the milk in a heavy pan on medium heat, stirring often, until the milk is almost absorbed — 25–30 minutes.",
      "Add the sugar; cook, stirring, until the mixture thickens again and turns glossy.",
      "Add the ghee and crushed cardamom; fry 5 minutes more until the halwa leaves the sides of the pan.",
      "Serve warm, topped with slivered almonds and cashews.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-moong-dal-halwa",
    name: { en: "Moong Dal Halwa", hindi: "मूंग दाल का हलवा" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 150 }, // mung beans (moong dal)
      { foodId: "usda-171314", grams: 55 }, // ghee
      { foodId: "usda-334247", grams: 80 }, // sugar
      { foodId: "usda-322892", grams: 200 }, // milk
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 15 }, // almonds
    ],
    method: [
      "Soak the mung beans for 4 hours (or overnight); drain and grind to a coarse paste with very little water.",
      "Heat the ghee; add the paste and roast on low heat for 20–25 minutes, stirring constantly, until golden and nutty and the ghee begins to separate.",
      "Warm the milk with 100 ml water; add it slowly to the paste, stirring fast.",
      "Add the sugar and crushed cardamom; stir until the halwa thickens and leaves the sides of the pan.",
      "Serve hot, topped with slivered almonds.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
  },
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
      "Whisk the yogurt with the honey, crushed cardamom and black pepper; chill.",
      "Cut the banana, apple and mango into bite-sized pieces; halve the grapes and strawberries.",
      "Fold the fruit through the spiced yogurt just before serving, so the fruit stays fresh.",
      "Serve chilled in small bowls.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-besan-ladoo",
    name: { en: "Besan Ladoo", hindi: "बेसन के लड्डू" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 150 }, // besan (chickpea flour)
      { foodId: "usda-171314", grams: 60 }, // ghee
      { foodId: "usda-334247", grams: 70 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 10 }, // almonds
    ],
    method: [
      "Sift the besan. Powder the sugar and crush the cardamom.",
      "Heat the ghee; add the besan and roast on low heat for 15–18 minutes, stirring constantly, until deep golden and nutty and the ghee glistens.",
      "Cool until warm — not hot — then mix in the sugar and cardamom.",
      "Roll into small balls while still warm; press a sliver of almond on each.",
      "Rest until firm; store in a dry jar.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-coconut-ladoo",
    name: { en: "Coconut Ladoo", hindi: "नारियल के लड्डू" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-170169", grams: 200 }, // coconut
      { foodId: "usda-322892", grams: 150 }, // milk
      { foodId: "usda-334247", grams: 70 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171314", grams: 10 }, // ghee
    ],
    method: [
      "Grate the coconut (or chop it very finely).",
      "Heat the ghee in a heavy pan; add the coconut and fry 2–3 minutes.",
      "Add the milk and sugar; cook on low heat, stirring often, for 10–12 minutes until the mixture thickens and comes together.",
      "Add the crushed cardamom; cook 1 minute more, then cool until you can handle it.",
      "Roll into small balls; rest until firm.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-shrikhand",
    name: { en: "Shrikhand", hindi: "श्रीखंड" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-330137", grams: 400 }, // Greek yogurt (the hung-curd stand-in)
      { foodId: "usda-334247", grams: 60 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 10 }, // almonds
      { foodId: "usda-2515374", grams: 10 }, // cashews
      { foodId: "usda-322892", grams: 20 }, // milk
    ],
    method: [
      "Powder the sugar and crush the cardamom.",
      "Whisk the Greek yogurt with the sugar until glossy and smooth — it is already thick, like hung curd.",
      "Loosen with the milk, a spoonful at a time, to a soft, spoonable consistency.",
      "Fold in the cardamom; chill for at least an hour.",
      "Serve topped with slivered almonds and cashews.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-atta-halwa",
    name: { en: "Atta Halwa", hindi: "आटे का हलवा" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 120 }, // whole wheat flour (atta)
      { foodId: "usda-171314", grams: 50 }, // ghee
      { foodId: "usda-334247", grams: 70 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
    ],
    method: [
      "Heat the ghee; add the flour and roast on low heat for 10–12 minutes, stirring constantly, until deep golden-brown and nutty.",
      "Warm 300 ml water. Add it slowly to the flour, stirring fast so no lumps form.",
      "Add the sugar and crushed cardamom; stir until the halwa thickens, turns glossy and leaves the sides of the pan.",
      "Serve hot.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-oats-kheer",
    name: { en: "Oats Kheer", hindi: "जई की खीर" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346396", grams: 80 }, // rolled oats
      { foodId: "usda-322892", grams: 700 }, // milk
      { foodId: "usda-334247", grams: 50 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-2346393", grams: 10 }, // almonds
      { foodId: "usda-2515374", grams: 10 }, // cashews
    ],
    method: [
      "Dry-roast the oats for 2–3 minutes until fragrant.",
      "Bring the milk to a boil; add the oats.",
      "Simmer on low heat for 12–15 minutes, stirring often, until the oats are soft and the milk has thickened.",
      "Add the sugar and crushed cardamom; simmer 3 minutes more.",
      "Serve warm or chilled, topped with slivered almonds and cashews.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-shahi-kheer",
    name: { en: "Shahi Kheer", hindi: "शाही खीर" },
    category: "dessert",
    servings: 4,
    cuisine: "india",
    lines: [
      { foodId: "usda-2512381", grams: 50 }, // white rice
      { foodId: "usda-322892", grams: 800 }, // milk
      { foodId: "usda-2515374", grams: 20 }, // cashews
      { foodId: "usda-2346393", grams: 20 }, // almonds
      { foodId: "usda-2346394", grams: 10 }, // walnuts
      { foodId: "usda-171330", grams: 5 }, // poppy seed
      { foodId: "usda-334247", grams: 60 }, // sugar
      { foodId: "usda-170919", grams: 1 }, // cardamom
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Rinse the rice and soak for 20 minutes; drain. Soak the poppy seed in a little warm milk for 15 minutes and grind to a paste.",
      "Bring the milk to a boil in a heavy pan with the cinnamon; add the rice.",
      "Simmer on low heat for 35–40 minutes, stirring often, until the rice is soft and the milk thick and creamy.",
      "Stir in the poppy-seed paste, sugar and crushed cardamom; simmer 5 minutes.",
      "Serve warm or chilled, generously topped with slivered cashews, almonds and walnuts.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "Extra cashews, almonds and walnuts with poppy seed — the festive, enriched kheer, richer than the everyday rice kheer.",
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
      "Dry-roast the cumin and crush it coarsely; grate the ginger.",
      "Blend or whisk the yogurt with about 300 ml cold water until frothy.",
      "Stir in the salt, cumin, black pepper, ginger, torn mint and coriander leaves.",
      "Serve chilled, in tall glasses.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Crush the cardamom and powder it with a little of the sugar.",
      "Blend the yogurt, milk, sugar and cardamom until smooth and frothy.",
      "Serve chilled, with the froth on top.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
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
      "Blend the yogurt with about 150 ml cold water and the salt until smooth and frothy.",
      "Pour into glasses; finish with the cumin, black pepper and torn mint.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Peel the mango and cut the flesh from the stone.",
      "Blend the mango, yogurt, milk, sugar and crushed cardamom until completely smooth.",
      "Serve chilled at once.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-shikanji",
    name: { en: "Shikanji", hindi: "शिकंजी" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-167746", grams: 60 }, // lemon
      { foodId: "usda-334247", grams: 25 }, // sugar
      { foodId: "usda-173468", grams: 1 }, // salt
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-170923", grams: 1 }, // cumin seeds (roasted in the method)
      { foodId: "usda-173475", grams: 4 }, // mint leaves
    ],
    method: [
      "Dry-roast the cumin and crush it coarsely.",
      "Squeeze the lemons; stir the juice into 500 ml cold water with the sugar and salt until dissolved.",
      "Add the cumin and black pepper; serve over ice with the mint leaves.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Grate the ginger. Warm the milk in a small pan — do not boil it hard.",
      "Whisk in the turmeric, cinnamon, black pepper and ginger; simmer gently for 3–4 minutes.",
      "Take off the heat; stir in the honey.",
      "Strain into mugs and serve hot.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-jeera-shikanji",
    name: { en: "Jeera Shikanji", hindi: "जीरा शिकंजी" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-170923", grams: 4 }, // cumin seeds (roasted in the method)
      { foodId: "usda-167746", grams: 20 }, // lemon (for its juice)
      { foodId: "usda-173468", grams: 1 }, // salt
      { foodId: "usda-173475", grams: 3 }, // mint leaves
      { foodId: "usda-169640", grams: 15 }, // honey
    ],
    method: [
      "Dry-roast the cumin until dark and fragrant; crush it coarsely.",
      "Soak the crushed cumin in 400 ml water for 10 minutes (or simmer 2 minutes for a stronger flavour); strain.",
      "Stir in the lemon juice, honey and salt.",
      "Serve chilled with the mint leaves.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
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
      "Soak the almonds and cashews in warm water for 15 minutes; drain and blend to a smooth paste with a little of the milk.",
      "Warm the rest of the milk; whisk in the nut paste, turmeric, cinnamon and crushed cardamom.",
      "Simmer gently for 5 minutes, stirring, until slightly thickened.",
      "Stir in the sugar; serve hot.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: true,
    enrichment:
      "Almonds and cashews blended into the milk make this the enriched, festive milk — richer than the everyday haldi doodh.",
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
      "Blend the yogurt with the mint, coriander and green chilli until pale green.",
      "Whisk in about 300 ml cold water and the salt until frothy.",
      "Serve chilled, finished with the roasted cumin.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-tarbooz-sharbat",
    name: { en: "Tarbooz Sharbat", hindi: "तरबूज़ शरबत" },
    category: "drink",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-167765", grams: 400 }, // watermelon
      { foodId: "usda-167746", grams: 15 }, // lemon (for its juice)
      { foodId: "usda-173475", grams: 5 }, // mint leaves
      { foodId: "usda-170931", grams: 1 }, // black pepper
      { foodId: "usda-173468", grams: 1 }, // salt
      { foodId: "usda-334247", grams: 10 }, // sugar
    ],
    method: [
      "Cut the watermelon flesh into chunks, removing the seeds.",
      "Blend with the lemon juice, sugar and salt until smooth; do not over-blend.",
      "Strain if you like it clear; serve chilled with the mint and a pinch of black pepper.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
  },
];
