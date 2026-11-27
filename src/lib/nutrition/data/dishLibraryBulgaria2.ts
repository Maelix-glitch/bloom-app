/**
 * Bulgarian wave 2 — the everyday Bulgarian table, widened: the full
 * chorba range, the skara grill, more clay pots and kavarma, the
 * fried dishes people actually eat on weekdays, festive roasts and
 * the sweet shelf. Wave 1 (dishLibraryBulgaria.ts) carried the
 * classics; this wave carries the rest of the week's cooking,
 * healthy and heavy alike, costed honestly either way, because a
 * catalogue that only shows the virtuous half of a cuisine teaches
 * nobody what to change.
 *
 * The owner's decision of 2026-11-26 governs this shelf: country
 * shelves carry the country's real food, so beef and pork ship AS
 * THEMSELVES here. The verified set's ground beef, ground pork and
 * pork loin cost the svinsko kavarma, the real kebapche and kyufte,
 * the teleshka kavarma and the rest, with the meat named in every
 * dish's name. (Wave 1 was built under the old rule and keeps its
 * lamb and turkey versions; both stand, as the library keeps
 * regional variants of a dish everywhere else.) The -Style suffix
 * now appears only where a genuine stand-in forces it, never for a
 * meat swap.
 *
 * The wave-1 stand-ins stand, stated the same way:
 *   · sirene is costed through cottage cheese, and kashkaval
 *     through cheddar (the library's cheeses, the paneer precedent);
 *   · kiselo mlyako is costed through the set's plain yogurt, and
 *     its strained form through Greek yogurt;
 *   · dill and parsley are stood in for by fresh coriander leaves;
 *   · banitsa sheets are rolled by hand from refined wheat flour,
 *     water and oil, no filo product existing in the set;
 *   · mayonnaise, which the set does not carry, is stood in for in
 *     the ruska salata by a yogurt, oil and lemon dressing, and the
 *     dish is named -Style for it;
 *   · sauerkraut is not in the set: the kapama is built on fresh
 *     cabbage soured with vinegar and named -Style, and the pork
 *     and chicken cabbage stews use fresh cabbage as their real
 *     pryasno-zele forms, no suffix owed;
 *   · the ashure's wheat berries are stood in for by pearled
 *     barley, the set's whole cooking grain, and named -Style;
 *   · the gevrek's yeasted dough and pekmez dip are stood in for
 *     by a yogurt dough and a honey-water dip, and named -Style;
 *   · the boza's fermentation culture is stood in for by a spoon
 *     of live yogurt, and named -Style;
 *   · karnache is a cased sausage and no casing exists in the set,
 *     so the pork karnache is hand-formed and named -Style, its
 *     meat the real pork.
 * Still impossible honestly, and still absent: shkembe chorba in
 * its real form (no tripe in the set; wave 1's Lenten mushroom
 * version stands), kozunak (no yeast), kadaif (no kadaif pastry),
 * fried zucchini (no zucchini in the set), and any dish built on
 * sausage, liver or cured meat the set does not carry.
 *
 * Every dish carries cuisine: "international" and a Devanagari
 * transliteration of its name in name.hindi, like the rest of the
 * international shelf.
 */

import type { Dish } from "../dishes";

export const BULGARIA2_DISHES: readonly Dish[] = [
  /* --------------------------- salads & sides --------------------------- */
  {
    id: "dish-bg2-ruska-salata-style",
    name: { en: "Bulgarian Russian Salad with Yogurt Dressing (Ruska Salata-Style)", hindi: "बुल्गारियाई रूसी सलाद (रुस्का सलाता)" },
    category: "side",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-2258586", grams: 300 }, // carrots
      { foodId: "usda-170419", grams: 200 }, // green peas
      { foodId: "usda-173424", grams: 150 }, // boiled eggs
      { foodId: "usda-2346406", grams: 200 }, // cucumber, quick-pickled in the method
      { foodId: "usda-330137", grams: 200 }, // Greek yogurt, standing in for mayonnaise in the dressing
      { foodId: "usda-171025", grams: 30 }, // sunflower oil, in the dressing
      { foodId: "usda-167746", grams: 30 }, // lemon, in the dressing
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar, for the cucumber
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Boil the potatoes in their skins until tender, about 25 minutes; boil the carrots for 12 minutes and the peas for 4 minutes, and drain everything well.",
      "Slice the cucumber into small cubes, toss with the vinegar and a pinch of the salt, and leave 20 minutes to quick-pickle, then drain.",
      "Peel the potatoes and cut them and the carrots into small even cubes; chop the boiled eggs.",
      "Whisk the Greek yogurt with the sunflower oil, lemon juice and the rest of the salt and the pepper into a smooth dressing, the house stand-in for mayonnaise.",
      "Combine the potatoes, carrots, peas, cucumber and egg in a wide bowl.",
      "Fold the dressing through gently until everything is coated but nothing is mashed.",
      "Rest the salad 30 minutes so the flavours settle, then serve cool, the festive salad of every Bulgarian table.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-turshiya",
    name: { en: "Bulgarian Mixed Pickled Vegetables (Turshiya)", hindi: "बुल्गारियाई मिश्रित अचार सब्ज़ियाँ (तुर्शिया)" },
    category: "side",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346407", grams: 500 }, // cabbage
      { foodId: "usda-2685573", grams: 300 }, // cauliflower
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-170427", grams: 200 }, // green peppers
      { foodId: "usda-2346406", grams: 200 }, // cucumber
      { foodId: "usda-173469", grams: 150 }, // apple cider vinegar
      { foodId: "usda-334247", grams: 20 }, // sugar
      { foodId: "usda-173468", grams: 20 }, // salt
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the cabbage into thick wedges, the cauliflower into florets, the carrots into batons, the peppers into strips and the cucumber into thick rounds.",
      "Slice the garlic and layer all the vegetables with it in a large clean jar or crock, tucking in the bay leaves.",
      "Stir the salt and sugar into the vinegar and 700 ml cold water until fully dissolved, a cold brine for this house pickle.",
      "Pour the brine over the vegetables until they are completely covered, and weigh them down so nothing floats.",
      "Cover and leave at room temperature for 2 days, then move the jar to the fridge.",
      "The turshiya is ready after 5 to 7 days in the fridge, crisp and sour, and keeps for a month refrigerated.",
      "Serve straight from the jar beside bean stews, rich mains and rakia, the winter salad of Bulgaria.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg2-bobena-salata",
    name: { en: "Bulgarian White Bean Salad (Bobena Salata)", hindi: "बुल्गारियाई सफ़ेद बीन्स सलाद (बोबेना सलाता)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 300 }, // navy beans, dry
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 20 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Soak the beans overnight, drain, cover with fresh water and boil gently for about 50 minutes until tender but holding their shape; salt near the end.",
      "Drain the beans and let them cool to lukewarm, warm beans drink the dressing best.",
      "Slice the onion into fine half-rings and the red pepper into short strips.",
      "Combine the beans, onion and pepper in a bowl.",
      "Dress with the sunflower oil and vinegar and toss through.",
      "Scatter the coriander leaves over and rest 15 minutes before serving, the bean salad that stands beside every grill.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-ogretin",
    name: { en: "Bulgarian Potato and Cheese Gratin (Ogretin)", hindi: "बुल्गारियाई आलू पनीर ग्राटिन (ओग्रेतिन)" },
    category: "side",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 800 }, // potatoes
      { foodId: "usda-328841", grams: 200 }, // cottage cheese, standing in for sirene
      { foodId: "usda-328637", grams: 100 }, // cheddar, standing in for kashkaval
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Boil the potatoes in their skins until just tender, about 20 minutes; drain, peel and cut into thick slices.",
      "Butter a baking dish and layer half the potatoes in it, seasoning with the salt and pepper.",
      "Crumble the cottage cheese over the potatoes and layer the rest of the potatoes on top.",
      "Whisk the eggs with the milk and pour the mixture evenly over the dish.",
      "Grate the cheddar over the top and dot with the remaining butter.",
      "Bake in the oven at 190°C for about 30 minutes until the top is deep golden and the custard is set.",
      "Rest 10 minutes before serving, ogretin cuts cleanly only after it settles.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-parzheni-kartofi",
    name: { en: "Bulgarian Fried Potatoes (Parzheni Kartofi)", hindi: "बुल्गारियाई तले आलू (पर्झेनी कार्तोफ़ी)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 800 }, // potatoes
      { foodId: "usda-171025", grams: 100 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Peel the potatoes and cut them into thick batons; rinse and dry them thoroughly, wet potatoes never crisp.",
      "Parboil the batons in salted water for 5 minutes, drain and steam dry in the colander for a few minutes.",
      "Heat the sunflower oil in a wide heavy pan until shimmering.",
      "Fry the potatoes in two batches, undisturbed for the first minutes, then turning, until deep golden and crisp all over, about 12 minutes a batch.",
      "Lift out onto paper to drain for a moment, never a pile that steams itself soft.",
      "Salt generously and serve at once, the fried potatoes no Bulgarian grill night is without.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-zapecheni-gabi",
    name: { en: "Bulgarian Baked Mushrooms with Cheese (Zapecheni Gabi s Kashkaval)", hindi: "बुल्गारियाई बेक्ड मशरूम पनीर (ज़ापेचेनी गाबी)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 600 }, // mushrooms
      { foodId: "usda-328637", grams: 150 }, // cheddar, standing in for kashkaval
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Wipe the mushrooms clean and cut the large ones in half; leave small ones whole.",
      "Melt the butter in a wide pan, add the mushrooms in one layer and sear over high heat for 5 minutes until they give up their water and brown.",
      "Add the crushed garlic, salt and pepper and toss for 1 minute.",
      "Tip the mushrooms and their butter into a shallow baking dish.",
      "Grate the cheddar thickly over the top.",
      "Bake in the oven at 200°C for about 12 minutes until the cheese is melted and bubbling at the edges.",
      "Scatter the coriander leaves over and serve straight from the dish with bread to catch the butter.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-morkovena-salata",
    name: { en: "Bulgarian Grated Carrot Salad (Morkovena Salata)", hindi: "बुल्गारियाई गाजर सलाद (मोर्कोवेना सलाता)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2258586", grams: 500 }, // carrots
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-1104647", grams: 5 }, // garlic
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Peel the carrots and grate them on the coarse side of the grater into long shreds.",
      "Crush the garlic to a paste with the salt.",
      "Whisk the garlic paste with the sunflower oil and the lemon juice.",
      "Pour the dressing over the carrots and toss well with your hands, lifting the shreds apart.",
      "Rest 15 minutes at room temperature so the carrots soften slightly in the dressing.",
      "Scatter the coriander leaves over and serve, the simplest salad on the Bulgarian table.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-zelenchuci-na-skara",
    name: { en: "Bulgarian Grilled Vegetables (Zelenchuci na Skara)", hindi: "बुल्गारियाई ग्रिल्ड सब्ज़ियाँ (ज़ेलेंचुत्सी ना स्कारा)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170108", grams: 300 }, // red peppers
      { foodId: "usda-170427", grams: 300 }, // green peppers
      { foodId: "usda-2685577", grams: 400 }, // eggplant
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the peppers into wide strips, the eggplant into thick rounds, the onion into wedges and leave the mushrooms whole.",
      "Salt the eggplant rounds and leave them 20 minutes, then pat dry, so they drink less oil on the grill.",
      "Brush everything lightly with half the sunflower oil.",
      "Grill the vegetables on a heavy ridged griddle in batches, turning once, until charred at the edges and tender, about 10 minutes a batch.",
      "Crush the garlic and stir it into the remaining oil with the vinegar and salt.",
      "Lay the hot vegetables on a platter and spoon the garlic dressing over them.",
      "Serve warm or at room temperature, the skara's vegetable plate.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-przheni-chushki",
    name: { en: "Bulgarian Fried Peppers in Tomato Sauce (Przheni Chushki s Domaten Sos)", hindi: "बुल्गारियाई तली मिर्च टमाटर सॉस (पर्झेनी चुश्की)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170427", grams: 600 }, // green peppers
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 60 }, // sunflower oil, for frying
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Wash the peppers and dry them very well, water in hot oil is the one danger of this dish.",
      "Fry the whole peppers in the sunflower oil in a covered pan, turning them, until their skins blister and brown on all sides, about 12 minutes.",
      "Lift the peppers out and keep them covered so the skins loosen; peel away the loosest skin.",
      "Grate the tomatoes and cook them down in the same pan with the crushed garlic, sugar and salt for 10 minutes to a thick sauce.",
      "Return the peppers to the sauce and simmer together for 5 minutes, spooning the sauce over them.",
      "Scatter the coriander leaves over and serve warm or cold, a summer dish eaten as often cold as hot.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- chutneys ------------------------------- */
  {
    id: "dish-bg2-katak",
    name: { en: "Bulgarian Roasted Pepper and Cheese Spread (Katak)", hindi: "बुल्गारियाई भुनी मिर्च पनीर स्प्रेड (काताक)" },
    category: "chutney",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-170108", grams: 500 }, // red peppers
      { foodId: "usda-328841", grams: 300 }, // cottage cheese, standing in for sirene
      { foodId: "usda-2259793", grams: 100 }, // plain yogurt
      { foodId: "usda-2346394", grams: 50 }, // walnuts
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Char the red peppers over a flame, turning them, until their skins blacken all over, about 10 minutes.",
      "Rest them covered for 10 minutes, then peel off the skins and remove the seeds.",
      "Chop the pepper flesh finely with a knife.",
      "Blend the cottage cheese with the yogurt, garlic, salt and sunflower oil to a smooth cream.",
      "Fold the chopped peppers and the finely chopped walnuts through the cream.",
      "Rest the katak at least 1 hour for the flavours to marry, then serve with warm bread, the Rhodope spread.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-bg2-lyuti-chushki",
    name: { en: "Bulgarian Pickled Hot Peppers (Lyuti Chushki)", hindi: "बुल्गारियाई तीखी मिर्च अचार (ल्युती चुश्की)" },
    category: "chutney",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-170106", grams: 300 }, // hot chili peppers, red
      { foodId: "usda-170497", grams: 200 }, // hot chili peppers, green
      { foodId: "usda-173469", grams: 150 }, // apple cider vinegar
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-173468", grams: 10 }, // salt
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Wash the hot peppers and prick each one once with a needle or the tip of a knife, so the brine can enter.",
      "Pack the peppers tightly into a clean jar with the sliced garlic and the coriander leaves.",
      "Stir the salt and sugar into the vinegar and 200 ml cold water until dissolved.",
      "Pour the brine over the peppers until they are covered, then float the sunflower oil on top to seal.",
      "Cover the jar and keep it in the fridge for at least a week before opening.",
      "Serve the peppers straight from the jar beside bean soups and hearty mains, and use the brine by the spoonful to sharpen a stew.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg2-lyutika",
    name: { en: "Bulgarian Crushed Roasted Pepper Relish (Lyutika)", hindi: "बुल्गारियाई कुचली भुनी मिर्च रेलिश (ल्युतिका)" },
    category: "chutney",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-170108", grams: 600 }, // red peppers
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170932", grams: 2 }, // cayenne, lyutika carries real heat
      { foodId: "usda-169997", grams: 15 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Char the red peppers over a flame until their skins blacken, rest them covered, then peel and deseed them.",
      "Blanch the tomatoes for 1 minute, peel them and chop the flesh.",
      "Pound the pepper flesh in a mortar, or crush it with the back of a spoon, to a coarse rough mash, lyutika is never a puree.",
      "Cook the tomatoes down in a pan for 8 minutes to a thick sauce.",
      "Combine the crushed peppers with the tomato, crushed garlic, sunflower oil, vinegar, salt and cayenne.",
      "Stir in the coriander leaves, rest 1 hour, and serve at room temperature, the village cousin of lyutenitsa.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ soups (chorbi) ----------------------------- */
  {
    id: "dish-bg2-agneshka-chorba",
    name: { en: "Bulgarian Lamb and Rice Soup (Agneshka Chorba)", hindi: "बुल्गारियाई मेमना चावल सूप (आग्नेश्का चोर्बा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 400 }, // ground lamb
      { foodId: "usda-2512381", grams: 80 }, // white rice
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-2259793", grams: 100 }, // plain yogurt, for the zastroika liaison
      { foodId: "usda-171287", grams: 50 }, // egg, for the liaison
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173475", grams: 10 }, // spearmint, the dzhodzhen of the soup
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the chopped onion and grated carrot in the sunflower oil for 5 minutes without colouring them.",
      "Crumble in the lamb and stir until it loses its raw colour and its juices run clear.",
      "Add the chopped tomatoes, salt and pepper and cook 5 minutes until the tomatoes melt.",
      "Pour in 1.2 litres of water, bring to a boil and skim the surface clean.",
      "Add the rinsed rice and the spearmint and simmer gently for about 20 minutes until the rice is tender.",
      "Whisk the yogurt with the egg in a bowl, ladle in a little hot soup to warm the mixture, then stir it back into the pot off the boil, the zastroika that must never curdle.",
      "Rest 5 minutes and serve hot with extra mint over, the lamb chorba of the spring table.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-zelenchukova-supa",
    name: { en: "Bulgarian Mixed Vegetable Soup (Zelenchukova Supa)", hindi: "बुल्गारियाई मिश्रित सब्ज़ी सूप (ज़ेलेंचुकोवा सूपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-2346407", grams: 200 }, // cabbage
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Soften the chopped onion and carrot in the sunflower oil for 5 minutes.",
      "Add the diced potatoes and shredded cabbage with 1.2 litres of water, the salt and the pepper, and bring to a boil.",
      "Simmer for 12 minutes, then add the chopped green beans and simmer 8 minutes more.",
      "Add the chopped tomatoes and the peas and simmer a final 5 minutes, the vegetables tender but not collapsed.",
      "Rest the soup 5 minutes off the heat.",
      "Serve with the coriander leaves scattered over, the garden soup of the Lenten table.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-kartofena-supa",
    name: { en: "Bulgarian Potato Soup (Kartofena Supa)", hindi: "बुल्गारियाई आलू सूप (कार्तोफ़ेना सूपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-168936", grams: 20 }, // refined wheat flour, for the light roux
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173475", grams: 5 }, // spearmint
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the chopped onion and grated carrot in half the butter for 5 minutes.",
      "Add the diced potatoes, the salt and pepper and 1 litre of water, bring to a boil and simmer about 18 minutes until the potatoes are tender.",
      "Melt the remaining butter in a small pan, stir in the flour and cook 1 minute to a pale roux.",
      "Whisk the milk into the roux a little at a time until smooth, then stir the sauce into the soup.",
      "Simmer 3 minutes more until the soup turns silky, crushing a few potato cubes against the side of the pot to thicken it.",
      "Scatter the spearmint over and serve hot, the potato soup of every school and home kitchen.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-domatena-supa",
    name: { en: "Bulgarian Tomato Soup with Rice (Domatena Supa s Oriz)", hindi: "बुल्गारियाई टमाटर चावल सूप (दोमातेना सूपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170457", grams: 800 }, // tomatoes
      { foodId: "usda-2512381", grams: 60 }, // white rice
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-168936", grams: 15 }, // refined wheat flour, for the zapruzhka
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-334247", grams: 5 }, // sugar, against the tomato acid
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Soften the chopped onion and grated carrot in the sunflower oil for 5 minutes.",
      "Stir in the flour and cook 1 minute, the zapruzhka that gives the soup its body.",
      "Add the grated tomatoes, the sugar and the salt and cook 8 minutes until the raw smell leaves.",
      "Pour in 1 litre of water, bring to a boil and add the rinsed rice.",
      "Simmer gently for about 18 minutes until the rice is tender and the soup is a deep red.",
      "Rest 5 minutes and serve with the coriander leaves over, summer's tomato soup.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-spanachena-supa",
    name: { en: "Bulgarian Spinach Soup (Spanachena Supa)", hindi: "बुल्गारियाई पालक सूप (स्पानाचेना सूपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168462", grams: 500 }, // spinach
      { foodId: "usda-2512381", grams: 60 }, // white rice
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2259793", grams: 150 }, // plain yogurt, for the liaison
      { foodId: "usda-171287", grams: 50 }, // egg, for the liaison
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173475", grams: 5 }, // spearmint
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the chopped onion in the sunflower oil for 4 minutes.",
      "Add the rinsed rice, the salt and 1 litre of water and simmer for 12 minutes.",
      "Wash the spinach well, chop it coarsely and add it to the pot with the spearmint.",
      "Simmer 6 minutes more until the spinach is dark green and tender and the rice is done.",
      "Whisk the yogurt with the egg, warm it with a ladle of the hot soup, and stir it back into the pot off the boil.",
      "Serve at once, the green spring soup that must not boil after its liaison.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-gabena-supa",
    name: { en: "Bulgarian Cream of Mushroom Soup (Gabena Supa)", hindi: "बुल्गारियाई मशरूम क्रीम सूप (गाबेना सूपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 500 }, // mushrooms
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-322892", grams: 300 }, // whole milk
      { foodId: "usda-168936", grams: 25 }, // refined wheat flour, for the roux
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Slice the mushrooms thickly; soften the chopped onion and grated carrot in half the butter for 5 minutes.",
      "Add the mushrooms and cook over high heat for 6 minutes until they brown lightly and their water cooks away.",
      "Pour in 700 ml of water, add the salt and pepper and simmer 10 minutes.",
      "Melt the remaining butter, stir in the flour and cook 1 minute, then whisk in the milk to a smooth sauce.",
      "Stir the sauce into the soup and simmer 3 minutes until it turns creamy; mash a ladle of the mushrooms against the side of the pot and stir them back in for body.",
      "Serve with the coriander leaves over, the mushroom soup of the forest districts.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-zeleva-chorba",
    name: { en: "Bulgarian Sour Cabbage Soup (Zeleva Chorba)", hindi: "बुल्गारियाई खट्टी पत्तागोभी सूप (ज़ेलेवा चोर्बा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346407", grams: 600 }, // cabbage
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-168936", grams: 15 }, // refined wheat flour, for the zapruzhka
      { foodId: "usda-173469", grams: 30 }, // apple cider vinegar, the souring
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the chopped onion and grated carrot in the sunflower oil for 5 minutes.",
      "Stir in the flour and cook 1 minute to a pale zapruzhka.",
      "Add the finely shredded cabbage, the bay leaves, salt and pepper with 1.1 litres of water and bring to a boil.",
      "Simmer for about 20 minutes until the cabbage is silky and tender.",
      "Add the grated tomatoes and simmer 8 minutes more.",
      "Stir in the vinegar off the heat, rest 5 minutes and serve, a sharp winter chorba that wakes the appetite.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------- kavarma & clay pots --------------------------- */
  {
    id: "dish-bg2-svinska-kavarma",
    name: { en: "Bulgarian Pork Kavarma (Svinska Kavarma)", hindi: "बुल्गारियाई सूअर कवर्मा (स्विन्स्का कवर्मा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin, the real meat of the dish
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Cut the pork loin into bite-size cubes and season with the salt and pepper.",
      "Sear the pork in the sunflower oil in a wide heavy pan over high heat until browned on all sides, about 8 minutes; lift it out.",
      "Soften the sliced onions in the same pan for 6 minutes, scraping up the browned juices.",
      "Add the sliced mushrooms and pepper strips and cook 5 minutes more.",
      "Return the pork with the chopped tomatoes and 100 ml of water, cover and simmer gently for about 25 minutes until the pork is tender and the sauce is thick.",
      "Scatter the coriander leaves over and serve from the pan with bread or rice, the tavern kavarma in its true meat.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-teleshka-kavarma",
    name: { en: "Bulgarian Beef Kavarma (Teleshka Kavarma)", hindi: "बुल्गारियाई गोमांस कवर्मा (तेलेश्का कवर्मा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168608", grams: 600 }, // ground beef, the real meat of the dish
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Crumble the beef into a wide heavy pan with the sunflower oil and sear over high heat, breaking it into coarse chunks, until well browned, about 8 minutes.",
      "Add the sliced onions and cook 6 minutes until they soften in the beef juices.",
      "Add the sliced mushrooms and pepper strips and cook 5 minutes more.",
      "Stir in the chopped tomatoes, cumin, salt and pepper with 100 ml of water.",
      "Cover and simmer gently for about 20 minutes until the sauce thickens and coats the meat.",
      "Scatter the coriander leaves over and serve hot, the beef kavarma of the mountain inns.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-pileshka-kavarma",
    name: { en: "Bulgarian Chicken Kavarma (Pileshka Kavarma)", hindi: "बुल्गारियाई चिकन कवर्मा (पिलेश्का कवर्मा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Cut the chicken into bite-size pieces and season with the salt and pepper.",
      "Sear the chicken in the sunflower oil in a wide heavy pan until golden on all sides, about 8 minutes; lift it out.",
      "Soften the sliced onions in the same pan for 6 minutes.",
      "Add the sliced mushrooms and pepper strips and cook 5 minutes more.",
      "Return the chicken with the chopped tomatoes and 100 ml of water, cover and simmer for about 20 minutes until the chicken is tender and the sauce thick.",
      "Scatter the coriander leaves over and serve, the lightest of the kavarma family.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-gabena-kavarma",
    name: { en: "Bulgarian Mushroom Kavarma (Gabena Kavarma)", hindi: "बुल्गारियाई मशरूम कवर्मा (गाबेना कवर्मा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 700 }, // mushrooms
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170108", grams: 150 }, // red pepper
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 45 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Slice the mushrooms thickly and cut the peppers into strips.",
      "Sear the mushrooms in half the sunflower oil over high heat in batches, until they brown and their water cooks away; lift them out.",
      "Soften the sliced onions in the remaining oil for 6 minutes.",
      "Add the peppers and cook 5 minutes, then the chopped tomatoes and crushed garlic.",
      "Return the mushrooms with the salt and pepper, cover and simmer 12 minutes until the sauce thickens around them.",
      "Scatter the coriander leaves over and serve, the Lenten kavarma that wants for nothing.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-sirene-po-shopski",
    name: { en: "Bulgarian Baked Cheese with Tomato and Egg (Sirene po Shopski)", hindi: "बुल्गारियाई बेक्ड पनीर टमाटर अंडा (सिरेने पो शोप्सकी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 400 }, // cottage cheese, standing in for sirene
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-171287", grams: 100 }, // eggs, one cracked over each pot
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-170427", grams: 100 }, // green pepper
      { foodId: "usda-170932", grams: 1 }, // cayenne, the hot pepper of the classic
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Butter four small clay pots or one shallow baking dish generously.",
      "Slice the tomatoes and the pepper and lay them in the pots with a pinch of the salt.",
      "Crumble the cottage cheese thickly over the vegetables in rough chunks, sirene po shopski is never neat.",
      "Dot with the remaining butter and sprinkle the cayenne over.",
      "Bake in the oven at 200°C for about 15 minutes until the cheese softens and the tomatoes slump.",
      "Crack an egg over each pot and bake 6 to 8 minutes more, until the whites set and the yolks still shine.",
      "Serve bubbling in its pots with bread, the dish the whole Shopska region is named by.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-gyuveche",
    name: { en: "Bulgarian Clay Pot with Pork, Cheese and Egg (Gyuveche)", hindi: "बुल्गारियाई मिट्टी के बर्तन में सूअर पनीर अंडा (ग्युवेचे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 400 }, // pork loin
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-328841", grams: 150 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the pork into cubes, the potatoes into chunks, the pepper into strips and the onion into wedges.",
      "Sear the pork in the sunflower oil in a wide pan until browned, about 7 minutes, seasoning with the salt and pepper.",
      "Divide the pork, potatoes, pepper, onion and chopped tomatoes between four clay pots (or layer them in one large pot).",
      "Cover the pots and bake in the oven at 190°C for about 40 minutes until the potatoes are tender.",
      "Uncover, crumble the cottage cheese over each pot and crack an egg into the centre.",
      "Bake 8 minutes more until the egg whites set, and serve each person their own pot, the gyuveche ritual.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-kapama-style",
    name: { en: "Bulgarian Festive Layered Cabbage Pot (Kapama-Style)", hindi: "बुल्गारियाई उत्सव पत्तागोभी मांस भांड (कापामा)" },
    category: "main",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 500 }, // pork loin
      { foodId: "usda-2646171", grams: 400 }, // chicken thigh
      { foodId: "usda-2346407", grams: 800 }, // fresh cabbage, standing in for sauerkraut
      { foodId: "usda-2512381", grams: 200 }, // white rice
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173469", grams: 60 }, // apple cider vinegar, to sour the fresh cabbage
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-173468", grams: 8 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Shred the cabbage finely, toss it with the vinegar and half the salt, and leave it 30 minutes to sour and soften, the house stand-in for sauerkraut stated in this wave's header.",
      "Cut the pork and chicken into large cubes and season with the remaining salt and the pepper.",
      "Soften the chopped onion in the sunflower oil for 5 minutes, then stir in the rinsed rice for 2 minutes until glossy.",
      "Layer a clay pot (or heavy casserole) with a third of the cabbage, half the meats, half the rice and onion, and repeat, finishing with cabbage and the chopped tomatoes and bay leaves on top.",
      "Pour in 300 ml of water, cover tightly and bake in the oven at 170°C for about 2 hours, until the meats are falling apart and the cabbage is silky.",
      "Rest the kapama 20 minutes in its pot before serving, the Bansko feast that anchors a winter table.",
    ],
    timeMinutes: 150,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* ------------------------------ more mains ------------------------------ */
  {
    id: "dish-bg2-patatnik",
    name: { en: "Bulgarian Rhodope Potato Pie (Patatnik)", hindi: "बुल्गारियाई रोडोप आलू पाई (पातात्निक)" },
    category: "main",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 1000 }, // potatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-328841", grams: 200 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-173475", grams: 10 }, // spearmint, the Rhodope seasoning
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Peel the potatoes and grate them coarsely; squeeze them hard in a clean cloth to remove their water, a wet patatnik steams instead of crisping.",
      "Grate the onion and stir it into the potatoes with the salt and the chopped spearmint.",
      "Whisk the eggs and fold them through the potato mixture with the crumbled cottage cheese.",
      "Grease a wide shallow baking pan with the sunflower oil and spread the mixture in an even layer.",
      "Dot the top generously with the butter.",
      "Bake in the oven at 190°C for about 45 minutes until the top is deep golden and crisp at the edges.",
      "Rest 10 minutes, cut in wedges and serve with yogurt, the Rhodope potato pie.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-imambayalda",
    name: { en: "Bulgarian Stuffed Eggplant in Tomato Sauce (Imambayalda)", hindi: "बुल्गारियाई भरा बैंगन टमाटर सॉस (इमामबायाल्डा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 800 }, // eggplants
      { foodId: "usda-790646", grams: 300 }, // onion
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171413", grams: 80 }, // olive oil, the dish is famous for its generosity with it
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 15 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Peel the eggplants in stripes, salt them and leave 20 minutes; rinse and pat dry.",
      "Fry the whole eggplants in half the olive oil, turning them, until golden and softened all over, about 10 minutes; lift them out.",
      "Soften the sliced onions in the remaining oil over low heat for about 15 minutes until sweet and golden, then add the crushed garlic.",
      "Add the chopped tomatoes, sugar and salt and cook 8 minutes to a thick filling.",
      "Cut a deep slit along each eggplant and press the flesh open; fill the pockets generously with the onion and tomato mixture.",
      "Lay the stuffed eggplants in a pan with any remaining filling and 100 ml of water, cover and braise gently for 20 minutes.",
      "Scatter the coriander leaves over and serve warm or at room temperature, the eggplant that made the imam swoon.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-kyufte-chirpanski",
    name: { en: "Bulgarian Meatballs in Tomato and Pepper Sauce (Kyufte po Chirpanski)", hindi: "बुल्गारियाई मीटबॉल टमाटर मिर्च सॉस (क्युफ़्ते पो चिर्पान्स्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 300 }, // ground pork
      { foodId: "usda-168608", grams: 300 }, // ground beef
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-168936", grams: 20 }, // refined wheat flour, for the sauce
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Knead the pork and beef mince with the finely grated onion, cumin, salt and pepper until it holds together; rest it 20 minutes.",
      "Shape the mince into walnut-size meatballs with wet hands.",
      "Brown the meatballs in the sunflower oil in a wide pan, turning them, about 8 minutes; lift them out.",
      "Soften the pepper strips in the same pan for 5 minutes, stir in the flour and cook 1 minute.",
      "Add the grated tomatoes, sugar and 200 ml of water and simmer 8 minutes to a thick sauce.",
      "Return the meatballs to the sauce, cover and simmer gently for 15 minutes until cooked through.",
      "Scatter the coriander leaves over and serve with bread or potatoes, Chirpan's meatballs in their sauce.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-pile-po-selski",
    name: { en: "Bulgarian Village Chicken with Peppers and Tomatoes (Pile po Selski)", hindi: "बुल्गारियाई गाँव का चिकन मिर्च टमाटर (पिले पो सेल्स्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-170108", grams: 250 }, // red peppers
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the chicken into large pieces and season with the salt and pepper.",
      "Sear the chicken in the sunflower oil in a wide heavy pan until golden on all sides, about 10 minutes; lift it out.",
      "Soften the sliced onions in the same pan for 6 minutes, then add the pepper strips and cook 5 minutes more.",
      "Add the chopped tomatoes, crushed garlic and bay leaves and cook 5 minutes until the sauce begins.",
      "Return the chicken with 150 ml of water, cover and braise gently for about 30 minutes until the chicken is tender and the sauce is rich.",
      "Rest 5 minutes and serve from the pan, the village chicken of the summer garden.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-pile-s-zele",
    name: { en: "Bulgarian Chicken with Fresh Cabbage (Pile s Pryasno Zele)", hindi: "बुल्गारियाई चिकन ताज़ा पत्तागोभी (पिले स प्र्यास्नो ज़ेले)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2346407", grams: 700 }, // fresh cabbage
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the chicken into pieces and season with the salt and pepper.",
      "Sear the chicken in the sunflower oil until golden, about 8 minutes; lift it out.",
      "Soften the chopped onion in the same pan for 5 minutes, then add the finely shredded cabbage a handful at a time, letting it wilt down.",
      "Add the grated tomatoes, bay leaves and cayenne and cook 5 minutes.",
      "Return the chicken, cover and braise gently for about 30 minutes until the cabbage is silky and the chicken tender.",
      "Rest 5 minutes and serve, the fresh-cabbage partner to the winter sauerkraut version.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-svinsko-s-zele",
    name: { en: "Bulgarian Pork with Fresh Cabbage (Svinsko s Pryasno Zele)", hindi: "बुल्गारियाई सूअर ताज़ा पत्तागोभी (स्विन्स्को स प्र्यास्नो ज़ेले)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin
      { foodId: "usda-2346407", grams: 700 }, // fresh cabbage
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the pork into cubes and season with the salt and pepper.",
      "Sear the pork in the sunflower oil in a heavy pot until browned on all sides, about 8 minutes; lift it out.",
      "Soften the chopped onion in the same pot for 5 minutes.",
      "Add the finely shredded cabbage a handful at a time, stirring as it wilts, then the grated tomatoes, bay leaves and cayenne.",
      "Return the pork with 150 ml of water, cover and braise gently for about 40 minutes until the pork is tender and the cabbage melts.",
      "Rest 5 minutes and serve, the fresh form of Bulgaria's pork and cabbage marriage.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-svinsko-s-oriz",
    name: { en: "Bulgarian Baked Pork with Rice (Svinsko s Oriz)", hindi: "बुल्गारियाई बेक्ड सूअर चावल (स्विन्स्को स ओरिज़)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin
      { foodId: "usda-2512381", grams: 250 }, // white rice
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173475", grams: 5 }, // spearmint
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the pork into cubes and season with the salt and pepper.",
      "Sear the pork in the sunflower oil in a wide pan until browned, about 8 minutes.",
      "Add the chopped onion and grated carrot and soften for 5 minutes.",
      "Stir in the rinsed rice for 2 minutes until every grain is glossy.",
      "Tip everything into a baking dish with 600 ml of hot water and the spearmint and stir once.",
      "Bake in the oven at 190°C for about 35 minutes until the rice is tender and has drunk the pork juices.",
      "Rest 10 minutes and serve, the Sunday bake of pork and rice.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-pile-na-furna",
    name: { en: "Bulgarian Roast Chicken with Potatoes (Pile na Furna s Kartofi)", hindi: "बुल्गारियाई रोस्ट चिकन आलू (पिले ना फुर्ना)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the chicken into large pieces and season with the salt, pepper and lemon juice; rest 20 minutes.",
      "Cut the potatoes into thick wedges and the carrots into batons; slice the onion into wedges.",
      "Toss the vegetables with half the sunflower oil and spread them in a wide roasting pan with the bay leaves.",
      "Lay the chicken pieces over the vegetables, skin side up where there is skin, and drizzle with the remaining oil.",
      "Pour 150 ml of water into the pan, cover loosely with foil and bake in the oven at 190°C for 30 minutes.",
      "Uncover and bake 20 minutes more until the chicken is deep golden and the potatoes are crisp at the edges.",
      "Rest 10 minutes and serve from the pan, the family roast of a Bulgarian Sunday.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-svinski-sach",
    name: { en: "Bulgarian Sizzling Pork Sach (Svinski Sach)", hindi: "बुल्गारियाई सिज़लिंग सूअर साच (स्विन्स्की साच)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 600 }, // pork loin
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-328637", grams: 100 }, // cheddar, standing in for kashkaval
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the pork into thin strips and season with the salt and pepper.",
      "Heat the clay sach (or a heavy cast-iron pan) until very hot and add the sunflower oil.",
      "Sear the pork in the sach for about 7 minutes until browned and sizzling.",
      "Add the sliced onions and mushrooms and cook 5 minutes, then the pepper strips for 4 minutes more.",
      "Add the chopped tomatoes and cook 3 minutes until they just begin to sauce the meat.",
      "Grate the cheddar over the top, cover for 2 minutes until it melts, and carry the sach to the table still sizzling.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-zelenchukov-sach",
    name: { en: "Bulgarian Sizzling Vegetable Sach (Zelenchukov Sach)", hindi: "बुल्गारियाई सिज़लिंग सब्ज़ी साच (ज़ेलेंचुकोव साच)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 300 }, // potatoes, par-cooked in the method
      { foodId: "usda-2685577", grams: 300 }, // eggplant
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-328637", grams: 80 }, // cheddar, standing in for kashkaval
      { foodId: "usda-171025", grams: 45 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the potatoes into small cubes and parboil them for 7 minutes; drain well.",
      "Cut the eggplant into cubes, the peppers into strips, the onion into wedges and the mushrooms into thick slices.",
      "Heat the clay sach (or a heavy cast-iron pan) until very hot and add the sunflower oil.",
      "Sear the potatoes and eggplant in the sach for about 8 minutes until golden at the edges.",
      "Add the onion, peppers and mushrooms and cook 6 minutes more, tossing once or twice.",
      "Add the chopped tomatoes, salt and pepper and cook 3 minutes, then grate the cheddar over, cover for 2 minutes to melt, and serve sizzling.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-spanak-s-oriz",
    name: { en: "Bulgarian Spinach with Rice (Spanak s Oriz)", hindi: "बुल्गारियाई पालक चावल (स्पानाक स ओरिज़)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168462", grams: 600 }, // spinach
      { foodId: "usda-2512381", grams: 200 }, // white rice
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173475", grams: 8 }, // spearmint
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soften the chopped onion in the sunflower oil for 4 minutes.",
      "Wash the spinach thoroughly, chop it coarsely and add it to the pot a handful at a time, letting each handful wilt.",
      "Stir in the rinsed rice, the spearmint and the salt with 450 ml of hot water.",
      "Cover and simmer gently for about 18 minutes until the rice is tender and has drunk the spinach juices.",
      "Rest the pot, covered, for 10 minutes off the heat.",
      "Serve with the lemon juice squeezed over, the Lenten spinach rice eaten all spring.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-bob-s-zele",
    name: { en: "Bulgarian Beans with Cabbage (Bob s Zele)", hindi: "बुल्गारियाई बीन्स पत्तागोभी (बोब स ज़ेले)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 300 }, // navy beans, dry
      { foodId: "usda-2346407", grams: 500 }, // cabbage
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173475", grams: 8 }, // spearmint
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the beans overnight, drain, cover with fresh water and boil gently for about 50 minutes until tender; keep their cooking liquid.",
      "Soften the chopped onion in the sunflower oil for 5 minutes.",
      "Add the finely shredded cabbage and cook, stirring, for 8 minutes until it wilts and sweetens.",
      "Add the grated tomatoes, cayenne and spearmint and cook 5 minutes.",
      "Stir in the beans with enough of their liquid to make a thick stew, add the salt and simmer together for 15 minutes.",
      "Rest 5 minutes and serve, the winter Lenten pot of beans and cabbage.",
    ],
    timeMinutes: 75,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-plneni-chushki-postni",
    name: { en: "Bulgarian Lenten Stuffed Peppers with Rice (Postni Plneni Chushki)", hindi: "बुल्गारियाई उपवास भरी मिर्च चावल (पोस्तनी प्लनेनी चुश्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170427", grams: 600 }, // green peppers, for stuffing
      { foodId: "usda-2512381", grams: 200 }, // white rice
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-171025", grams: 45 }, // sunflower oil
      { foodId: "usda-173475", grams: 8 }, // spearmint
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Cut the tops off the peppers and scoop out the seeds, keeping the tops as lids.",
      "Soften the chopped onion and grated carrot in the sunflower oil for 5 minutes.",
      "Stir in the rinsed rice, half the grated tomato, the spearmint, salt and coriander and cook 3 minutes.",
      "Fill the peppers loosely with the rice mixture, the rice needs room to swell, and cap them with their lids.",
      "Stand the peppers upright in a baking dish, pour the remaining tomato and 200 ml of water around them and drizzle with a little more oil.",
      "Bake in the oven at 190°C for about 45 minutes until the peppers slump and the rice is tender.",
      "Serve warm or at room temperature, the meatless stuffed peppers of the fast days.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-patladzhanena-musaka",
    name: { en: "Bulgarian Eggplant and Lamb Musaka (Patladzhanena Musaka)", hindi: "बुल्गारियाई बैंगन मेमना मूसाका (पातलाद्झानेना मूसाका)" },
    category: "main",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 700 }, // eggplants
      { foodId: "usda-174370", grams: 500 }, // ground lamb
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt, for the topping
      { foodId: "usda-171287", grams: 100 }, // eggs, for the topping
      { foodId: "usda-168936", grams: 30 }, // refined wheat flour, for the topping
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-170923", grams: 3 }, // cumin
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Slice the eggplants into thick rounds, salt them and leave 20 minutes; rinse and pat dry.",
      "Fry the eggplant rounds in the sunflower oil in batches until golden on both sides, about 8 minutes a batch; drain on paper.",
      "Crumble the lamb into the same pan and brown it well, then soften the chopped onion with it for 5 minutes.",
      "Add the chopped tomatoes, cumin, salt and pepper and simmer 10 minutes to a thick meat sauce.",
      "Layer the eggplant and the meat sauce in a baking dish, finishing with eggplant.",
      "Whisk the yogurt with the eggs and flour and pour the topping evenly over the dish.",
      "Bake in the oven at 190°C for about 30 minutes until the topping is set and golden, then rest 15 minutes before cutting.",
    ],
    timeMinutes: 70,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-postna-musaka",
    name: { en: "Bulgarian Lenten Potato Musaka (Postna Musaka)", hindi: "बुल्गारियाई उपवास आलू मूसाका (पोस्तना मूसाका)" },
    category: "main",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 900 }, // potatoes
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt, for the topping
      { foodId: "usda-171287", grams: 100 }, // eggs, for the topping
      { foodId: "usda-168936", grams: 25 }, // refined wheat flour, for the topping
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-170923", grams: 2 }, // cumin
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Peel the potatoes and cut them into small cubes.",
      "Soften the chopped onion in the sunflower oil for 5 minutes, then add the potatoes and cook, stirring, for 8 minutes.",
      "Add the chopped tomatoes, cumin, salt and pepper with 150 ml of water and simmer 10 minutes until the potatoes are nearly tender.",
      "Tip everything into a baking dish and level the top.",
      "Whisk the yogurt with the eggs and flour and pour the topping evenly over.",
      "Bake in the oven at 190°C for about 30 minutes until the topping is golden and set.",
      "Rest 15 minutes before serving, the meatless musaka of the fast, rich without meat.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-bamya",
    name: { en: "Bulgarian Okra in Tomato Sauce (Bamya)", hindi: "बुल्गारियाई भिंडी टमाटर सॉस (बाम्या)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-169260", grams: 600 }, // okra
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173469", grams: 20 }, // apple cider vinegar, against the okra's slipperiness
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Trim the okra caps carefully without cutting into the pods, rinse and toss with the vinegar and a pinch of the salt; leave 20 minutes, the old defence against sliminess.",
      "Soften the chopped onion in the sunflower oil for 5 minutes.",
      "Add the grated tomatoes and crushed garlic and cook 8 minutes to a thick sauce.",
      "Drain the okra, lay it over the sauce in one layer and add 100 ml of water.",
      "Cover and simmer gently for about 20 minutes without stirring, shaking the pan once or twice, until the okra is tender.",
      "Scatter the coriander leaves over and serve, the okra stew of the southern districts.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-kromid-yahniya",
    name: { en: "Bulgarian Onion Stew (Kromid Yahniya)", hindi: "बुल्गारियाई प्याज़ स्टू (क्रोमिद याहनिया)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-790646", grams: 900 }, // onions, the dish itself
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-168936", grams: 20 }, // refined wheat flour
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Slice the onions into thick half-rings, this stew is onions and almost nothing else.",
      "Soften the onions in the sunflower oil over low heat, covered, for about 20 minutes, stirring now and then, until they collapse and sweeten without browning.",
      "Stir in the flour and cook 1 minute.",
      "Add the grated tomatoes, sugar, bay leaves, salt and pepper with 150 ml of water.",
      "Simmer gently for about 20 minutes until the onions melt into a thick sweet-sour sauce.",
      "Stir in the vinegar, rest 5 minutes and serve with bread, the humblest and proudest of the Lenten yahniya.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-gabi-s-oriz",
    name: { en: "Bulgarian Mushroom Rice (Gabi s Oriz)", hindi: "बुल्गारियाई मशरूम चावल (गाबी स ओरिज़)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 500 }, // mushrooms
      { foodId: "usda-2512381", grams: 250 }, // white rice
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper, generously, as the dish demands
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Slice the mushrooms thickly and chop the onion finely.",
      "Sear the mushrooms in the sunflower oil over high heat for 6 minutes until they brown and their water cooks away.",
      "Add the onion and soften for 4 minutes.",
      "Stir in the rinsed rice, the salt and the pepper for 2 minutes until the grains are glossy.",
      "Pour in 550 ml of hot water, cover and simmer gently for about 18 minutes until the rice is tender.",
      "Rest 10 minutes off the heat, scatter the coriander leaves over and serve, the forest rice of the Lenten table.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------- the skara (grill) --------------------------- */
  {
    id: "dish-bg2-kyufte-skara",
    name: { en: "Bulgarian Grilled Pork and Beef Meatballs (Kyufte)", hindi: "बुल्गारियाई ग्रिल्ड सूअर गोमांस क्युफ़्ते (क्युफ़्ते)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 350 }, // ground pork, half the classic mince
      { foodId: "usda-168608", grams: 350 }, // ground beef, half the classic mince
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170923", grams: 5 }, // cumin, the kyufte spice
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the grill
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the pork and beef mince with the finely grated onion, cumin, salt and pepper for several minutes until the mixture turns sticky and holds together.",
      "Rest the mince in the fridge for at least 1 hour, cold mince grills without falling apart.",
      "Shape the mince into plump oval meatballs with wet hands, flattening each slightly.",
      "Brush a heavy ridged griddle with the sunflower oil and heat it until it shimmers.",
      "Grill the kyufteta on the griddle, turning them, for about 10 minutes until browned on all sides and cooked through.",
      "Rest 3 minutes and serve with lyutenitsa and fried potatoes, the real kyufte of the skara, in its true meats.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-kebapche-skara",
    name: { en: "Bulgarian Grilled Pork and Beef Kebapche", hindi: "बुल्गारियाई ग्रिल्ड सूअर गोमांस केबापचे (केबापचे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 350 }, // ground pork
      { foodId: "usda-168608", grams: 350 }, // ground beef
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170923", grams: 6 }, // cumin, heavier than in kyufte, as the classic runs
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the grill
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the pork and beef mince with the finely grated onion, cumin, salt and pepper until sticky and uniform.",
      "Rest the mince in the fridge for at least 1 hour so the kebapcheta hold their shape.",
      "With wet hands, roll the mince into finger-thick cylinders about the length of a thumb, the kebapche shape.",
      "Brush a heavy ridged griddle with the sunflower oil and heat it until it shimmers.",
      "Grill them on the griddle, rolling them a quarter turn at a time, for about 10 minutes until browned all around.",
      "Serve three to a portion with beans or fries and a sharp salad, the kebapche of every Bulgarian grill house, in its true meats.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-karnache-style",
    name: { en: "Bulgarian Pork Karnache-Style Sausages (Karnache)", hindi: "बुल्गारियाई सूअर कार्नाचे सॉसेज (कार्नाचे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 700 }, // ground pork, the real meat of karnache
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-170932", grams: 1 }, // cayenne
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the grill
      { foodId: "usda-173468", grams: 7 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Knead the pork mince with the crushed garlic, cumin, cayenne, salt and pepper until sticky; the -Style in the name is for the missing casing, no casing existing in the verified set, never for the meat, which is the real pork.",
      "Rest the mince in the fridge for at least 1 hour.",
      "With wet hands, form the mince into long thin coils and then into tight spirals, the karnache shape pressed from the hand instead of a casing.",
      "Brush a heavy ridged griddle with the sunflower oil and heat it until it shimmers.",
      "Grill the spirals on the griddle, turning once carefully, for about 12 minutes until browned and cooked through.",
      "Serve with beans and a shopska salad, the grill sausage of the Bulgarian winter.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-svinski-parzholi",
    name: { en: "Bulgarian Grilled Pork Loin Steaks (Svinski Parzholi na Skara)", hindi: "बुल्गारियाई ग्रिल्ड सूअर स्टेक (स्विन्स्की पर्झोली)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646168", grams: 700 }, // pork loin, cut as steaks in the method
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Cut the pork loin into four thick steaks and beat each lightly between sheets of paper to an even thickness.",
      "Rub the steaks with the crushed garlic, salt, pepper and half the sunflower oil and leave 30 minutes.",
      "Pat the steaks dry once more before they meet the heat, a dry surface takes the grill's marks best.",
      "Grill the steaks on a heavy ridged griddle over high heat for about 5 minutes a side, until well marked and just cooked through.",
      "Rest the steaks 5 minutes, covered, so their juices settle.",
      "Squeeze the lemon over and serve with grilled vegetables and a bean salad, the pork steak of the skara.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-pileshki-shishcheta",
    name: { en: "Bulgarian Chicken Skewers (Pileshki Shishcheta)", hindi: "बुल्गारियाई चिकन सीख (पिलेश्की शिशचेता)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170108", grams: 200 }, // red pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 30 }, // sunflower oil, in the marinade
      { foodId: "usda-167746", grams: 30 }, // lemon, in the marinade
      { foodId: "usda-170923", grams: 2 }, // cumin
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the chicken into large cubes and toss with the sunflower oil, lemon juice, cumin, salt and pepper; leave 30 minutes.",
      "Cut the pepper and onion into chunks the size of the chicken pieces.",
      "Thread the chicken onto skewers, alternating with the pepper and onion chunks.",
      "Heat a heavy ridged griddle until it is very hot and brush it with a little of the marinade's oil.",
      "Grill the skewers on the griddle, turning them a quarter at a time, for about 12 minutes until the chicken is charred at the edges and cooked through.",
      "Rest 3 minutes and serve with a yogurt sauce or a shopska salad, the chicken of the skara.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ fried mains ------------------------------ */
  {
    id: "dish-bg2-przheni-kyufteta",
    name: { en: "Bulgarian Pan-Fried Pork and Beef Meatballs (Parzheni Kyufteta)", hindi: "बुल्गारियाई तले सूअर गोमांस क्युफ़्ते (पर्झेनी क्युफ़्तेता)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514745", grams: 300 }, // ground pork
      { foodId: "usda-168608", grams: 300 }, // ground beef
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, the binder
      { foodId: "usda-168936", grams: 40 }, // refined wheat flour, the light coating
      { foodId: "usda-171025", grams: 70 }, // sunflower oil, for frying
      { foodId: "usda-170923", grams: 4 }, // cumin
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Knead the pork and beef mince with the finely grated onion, the egg, cumin, salt and pepper until the mixture binds.",
      "Rest the mince in the fridge for 30 minutes.",
      "Shape plump round meatballs with wet hands and roll each lightly in the flour.",
      "Heat the sunflower oil in a wide pan until it shimmers.",
      "Fry the meatballs in the oil over medium heat, turning them, for about 12 minutes until deep golden and cooked through.",
      "Drain for a moment on paper and serve with a tomato salad and bread, the weekday fried kyufte of the home kitchen, distinct from their grilled brothers.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-ribni-kyufteta",
    name: { en: "Bulgarian Fish Cakes (Ribni Kyufteta)", hindi: "बुल्गारियाई मछली केक (रिबनी क्युफ़्तेता)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 500 }, // Atlantic mackerel
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, the binder
      { foodId: "usda-168936", grams: 50 }, // refined wheat flour, the coating
      { foodId: "usda-171025", grams: 60 }, // sunflower oil, for frying
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Boil the potatoes until tender, drain and mash them dry.",
      "Poach the mackerel in barely simmering water for 8 minutes; lift it out, discard the skin and bones and flake the flesh coarsely.",
      "Combine the fish with the mashed potato, finely chopped onion, the egg, coriander leaves, salt and pepper and mix to a firm paste.",
      "Shape the mixture into flat cakes and roll each in the flour.",
      "Fry the cakes in the sunflower oil until deep golden on both sides, about 8 minutes in all.",
      "Serve with the lemon squeezed over and a cabbage salad, the fish cakes of the Danube and the coast.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-parzena-riba",
    name: { en: "Bulgarian Fried Fish with Flour Crust (Parzena Riba)", hindi: "बुल्गारियाई तली मछली (पर्झेना रीबा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia, the frying fish of the house
      { foodId: "usda-168936", grams: 80 }, // refined wheat flour, the crust
      { foodId: "usda-171025", grams: 80 }, // sunflower oil, for frying
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the fish into portions, salt them and leave 15 minutes; pat them completely dry.",
      "Spread the flour on a plate and coat each piece of fish on all sides, shaking off the excess.",
      "Heat the sunflower oil in a wide pan until shimmering.",
      "Fry the fish in batches, undisturbed, for about 4 minutes a side until the crust is deep golden and crisp.",
      "Drain for a moment on paper, never in a steaming pile.",
      "Serve at once with the lemon squeezed over and a potato salad, the fried fish of every Bulgarian fish restaurant.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- breakfasts ------------------------------- */
  {
    id: "dish-bg2-mekitsi",
    name: { en: "Bulgarian Fried Yogurt Dough (Mekitsi)", hindi: "बुल्गारियाई तला दही आटा (मेकित्सी)" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 250 }, // plain yogurt, the dough's leaven and tang
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-171025", grams: 120 }, // sunflower oil, for deep frying
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Stir the yogurt with the egg, sugar and salt, then work in the flour to a soft, sticky dough.",
      "Knead the dough on a floured board for 5 minutes until smooth and elastic, then cover and rest it 30 minutes.",
      "Heat the sunflower oil in a deep pan to a steady frying heat, a crumb of dough should sizzle at once.",
      "With oiled hands, tear off pieces of dough and stretch each into a thin round, thinner in the middle.",
      "Fry the mekitsi one or two at a time, turning once, until puffed and deep golden on both sides, about 3 minutes each.",
      "Drain on paper and serve hot with jam, honey, cheese or a dusting of sugar, the fried dough of Bulgarian childhood.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-milinki",
    name: { en: "Bulgarian Cheese Breakfast Buns (Milinki)", hindi: "बुल्गारियाई पनीर नाश्ता बन (मिलिन्की)" },
    category: "breakfast",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 500 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-328841", grams: 200 }, // cottage cheese, standing in for sirene
      { foodId: "usda-173410", grams: 60 }, // butter, for the topping
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Work the flour with the yogurt, egg, sunflower oil and salt into a soft dough; knead 5 minutes and rest 30 minutes.",
      "Roll the dough out and cut or tear it into small balls, each the size of a walnut.",
      "Pack the balls snugly side by side in a buttered baking pan, milinki bake shoulder to shoulder.",
      "Crumble the cottage cheese generously over and between the balls.",
      "Melt the butter and spoon it over the whole pan.",
      "Bake in the oven at 190°C for about 30 minutes until the tops are golden and the cheese edges crisp.",
      "Serve warm from the pan with yogurt or ayran, the breakfast buns of the Bulgarian weekend.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-katmi",
    name: { en: "Bulgarian Griddle Pancakes (Katmi)", hindi: "बुल्गारियाई तवा पैनकेक (कात्मी)" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 300 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-322892", grams: 150 }, // whole milk
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-173410", grams: 40 }, // butter, for the griddle and the top
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the flour with the yogurt, milk, egg and salt into a batter the thickness of cream; rest it 20 minutes.",
      "Heat a heavy griddle or wide pan and grease it lightly with butter.",
      "Ladle in batter and spread it into a round pancake, thicker than a crepe.",
      "Cook the katma until bubbles cover its surface and the underside is golden, about 2 minutes, then turn and cook 1 minute more.",
      "Stack the katmi as they come off the griddle, brushing each with butter.",
      "Serve warm with cheese, jam or honey, the griddle cakes of Thrace.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-przheni-filiyki",
    name: { en: "Bulgarian Fried Bread Slices (Przheni Filiyki)", hindi: "बुल्गारियाई तली ब्रेड स्लाइस (पर्झेनी फ़िलिय्की)" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 350 }, // refined wheat flour, for the loaf baked in the method
      { foodId: "usda-171287", grams: 100 }, // eggs, for the dipping batter
      { foodId: "usda-322892", grams: 150 }, // whole milk, for the batter
      { foodId: "usda-171025", grams: 60 }, // sunflower oil, for frying
      { foodId: "usda-173410", grams: 20 }, // butter, for the loaf pan
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Work the flour with 200 ml of water and the salt into a dough, knead 5 minutes and rest 30 minutes.",
      "Shape the dough into a small loaf in a buttered pan and bake in the oven at 190°C for about 25 minutes; cool it completely, day-old bread fries best of all.",
      "Cut the loaf into thick slices.",
      "Whisk the eggs with the milk in a shallow dish.",
      "Dip each slice in the egg mixture on both sides, letting it drink but not fall apart.",
      "Fry the slices in the sunflower oil until deep golden on both sides, about 4 minutes in all.",
      "Serve hot with cheese, jam or sugar, the fried slices of every Bulgarian grandmother's kitchen.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-popara",
    name: { en: "Bulgarian Bread and Cheese Popara (Popara)", hindi: "बुल्गारियाई ब्रेड पनीर पोपारा (पोपारा)" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 300 }, // refined wheat flour, for the flat loaf baked in the method
      { foodId: "usda-322892", grams: 500 }, // whole milk
      { foodId: "usda-328841", grams: 150 }, // cottage cheese, standing in for sirene
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Work the flour with 180 ml of water and the salt into a dough, roll it into a flat round and bake in the oven at 200°C for about 15 minutes until firm and pale gold; popara was born as the use for bread already baked.",
      "Tear the loaf into bite-size pieces into a wide bowl.",
      "Heat the milk to just below boiling with the butter melted into it.",
      "Crumble the cottage cheese over the bread pieces.",
      "Pour the hot milk over the bread and cheese until the pieces are soaked but the bowl is not soup.",
      "Cover and rest 5 minutes, then serve warm with a spoon, the frugal breakfast that wastes nothing.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-omlet",
    name: { en: "Bulgarian Pepper and Cheese Omelette (Omlet s Chushki i Sirene)", hindi: "बुल्गारियाई मिर्च पनीर आमलेट (ओम्लेत)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-170427", grams: 100 }, // green pepper
      { foodId: "usda-170108", grams: 100 }, // red pepper
      { foodId: "usda-328841", grams: 80 }, // cottage cheese, standing in for sirene
      { foodId: "usda-173410", grams: 25 }, // butter
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-170931", grams: 1 }, // black pepper
    ],
    method: [
      "Cut the peppers into thin strips and soften them in half the butter for 5 minutes until they slump.",
      "Whisk the eggs with the salt and pepper until uniform.",
      "Add the remaining butter to the pan, pour in the eggs and let them set at the edges for 1 minute.",
      "Draw the setting eggs toward the centre with a spatula, letting the liquid egg run underneath, until the omelette is nearly set.",
      "Crumble the cottage cheese over one half and fold the omelette over it.",
      "Slide it onto a warm plate and serve at once, the quick omelette of the Bulgarian weekday morning, distinct from mish-mash's scramble.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------------- breads --------------------------------- */
  {
    id: "dish-bg2-zelnik",
    name: { en: "Bulgarian Cabbage Banitsa (Zelnik)", hindi: "बुल्गारियाई पत्तागोभी बानित्सा (ज़ेल्निक)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 450 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-2346407", grams: 600 }, // cabbage
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Work the flour with 220 ml of water, a spoon of the oil and half the salt into a smooth dough; rest it 30 minutes.",
      "Shred the cabbage finely and soften it with the chopped onion in half the remaining oil for about 12 minutes until it collapses and sweetens; season with the rest of the salt and the pepper and cool.",
      "Roll the dough into thin sheets on a floured cloth, stretching each gently toward the edges.",
      "Brush a sheet with oil, scatter the cabbage along it and roll it up loosely; coil the rolls into a greased round pan.",
      "Repeat with the remaining sheets and filling, then brush the whole zelnik with oil.",
      "Bake in the oven at 190°C for about 35 minutes until deep golden and crisp.",
      "Rest 10 minutes and serve warm, the cabbage banitsa of the winter table.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-klin",
    name: { en: "Bulgarian Rice Banitsa (Klin)", hindi: "बुल्गारियाई चावल बानित्सा (क्लिन)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 450 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-2512381", grams: 150 }, // white rice
      { foodId: "usda-2259793", grams: 150 }, // plain yogurt
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-328841", grams: 200 }, // cottage cheese, standing in for sirene
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Boil the rice in salted water until just tender, drain and cool it.",
      "Work the flour with 220 ml of water and the salt into a smooth dough; rest it 30 minutes.",
      "Stir the rice with the yogurt, the whisked eggs and the crumbled cottage cheese.",
      "Roll the dough into thin sheets on a floured cloth.",
      "Layer the sheets in a buttered pan, brushing each with melted butter and scattering the rice filling between them, finishing with a sheet.",
      "Brush the top with butter and bake in the oven at 190°C for about 35 minutes until deep golden.",
      "Rest 10 minutes and serve warm, the Rhodope rice banitsa called klin.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-tutmanik",
    name: { en: "Bulgarian Cheese Buns (Tutmanik)", hindi: "बुल्गारियाई पनीर बन (तुत्मानिक)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 500 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-328841", grams: 250 }, // cottage cheese, standing in for sirene
      { foodId: "usda-173410", grams: 60 }, // butter
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Work the flour with the yogurt, one of the eggs, the sunflower oil and the salt into a soft dough; knead 5 minutes and rest 30 minutes.",
      "Roll the dough into a large rectangle and brush it with half the melted butter.",
      "Scatter the crumbled cottage cheese evenly over the dough.",
      "Roll the rectangle up tightly and cut the roll into thick rounds.",
      "Stand the rounds upright in a buttered pan, brush with the remaining butter and the second whisked egg.",
      "Bake in the oven at 190°C for about 30 minutes until the tutmanik is risen and deep golden.",
      "Serve warm, torn apart by hand at the table.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-pogacha",
    name: { en: "Bulgarian Festive Round Bread (Pogacha)", hindi: "बुल्गारियाई उत्सव गोल ब्रेड (पोगाचा)" },
    category: "bread",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 600 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-171287", grams: 50 }, // egg, in the dough and on the glaze
      { foodId: "usda-173410", grams: 60 }, // butter
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-170150", grams: 10 }, // sesame seeds, for the top
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Work the flour with the yogurt, milk, half the egg, the sugar and the salt into a soft dough; knead 8 minutes until smooth and elastic.",
      "Cover the dough and rest it 45 minutes until it relaxes and puffs.",
      "Shape the dough into a round loaf in a buttered pan, pressing a simple cross or braid into its top, the pogacha's festive dressing.",
      "Brush the loaf with the remaining whisked egg and scatter the sesame seeds over.",
      "Bake in the oven at 180°C for about 35 minutes until the loaf is deep golden and sounds hollow underneath.",
      "Rest the pogacha under a cloth for 15 minutes, then break it by hand at the table, the bread of weddings and feast days.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-pyrlenka",
    name: { en: "Bulgarian Cheese Flatbread (Pyrlenka s Sirene)", hindi: "बुल्गारियाई पनीर फ्लैटब्रेड (पिर्लेन्का)" },
    category: "bread",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 100 }, // plain yogurt
      { foodId: "usda-328841", grams: 150 }, // cottage cheese, standing in for sirene
      { foodId: "usda-328637", grams: 80 }, // cheddar, standing in for kashkaval
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Work the flour with the yogurt, 120 ml of water and the salt into a soft dough; rest it 20 minutes.",
      "Roll the dough into a large thin round and lay it on a floured baking tray.",
      "Crumble the cottage cheese over the round and grate the cheddar over it.",
      "Dot with the butter and scatter the finely sliced garlic over.",
      "Bake in the oven at 220°C for about 12 minutes until the edges are crisp and the cheese bubbles.",
      "Serve at once, torn into pieces, the flatbread that starts a grill meal.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-byurek-kayma",
    name: { en: "Bulgarian Mince Borek (Byurek s Kayma)", hindi: "बुल्गारियाई कीमा बोरेक (ब्युरेक स कायमा)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 450 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-2514745", grams: 400 }, // ground pork, the classic borek mince
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-171287", grams: 50 }, // egg, for the wash
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Work the flour with 220 ml of water, a spoon of the oil and half the salt into a smooth dough; rest it 30 minutes.",
      "Crumble the pork into a pan and brown it well, then soften the finely chopped onion with it for 5 minutes; season with the remaining salt and the pepper and cool the filling.",
      "Roll the dough into thin sheets on a floured cloth.",
      "Brush a sheet with oil, scatter the mince along it and roll it up; coil the rolls into a greased round pan.",
      "Repeat with the remaining sheets and filling, brush the whole byurek with the whisked egg and the remaining oil.",
      "Bake in the oven at 190°C for about 35 minutes until deep golden and crisp.",
      "Rest 10 minutes and serve warm, the meat borek of the bakeries.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-gevrek-style",
    name: { en: "Bulgarian Sesame Bread Rings (Gevrek-Style)", hindi: "बुल्गारियाई तिल ब्रेड रिंग (गेव्रेक)" },
    category: "bread",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 150 }, // plain yogurt, standing in for the yeasted dough
      { foodId: "usda-169640", grams: 30 }, // honey, standing in for the pekmez dip
      { foodId: "usda-170150", grams: 40 }, // sesame seeds, the coating
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Work the flour with the yogurt, the sugar, the salt and enough water for a firm dough; the -Style is for this yogurt dough standing in for the yeasted original, there being no yeast in the verified set.",
      "Knead the dough 8 minutes until smooth and rest it 30 minutes.",
      "Divide the dough into four and roll each piece into a long rope; join the ends into rings and pinch the joins closed.",
      "Stir the honey into 100 ml of water in a shallow dish and spread the sesame seeds on a plate.",
      "Dip each ring in the honey water, then press it into the sesame seeds on both sides.",
      "Bake the rings in the oven at 200°C for about 18 minutes until deep golden and crisp.",
      "Cool on a rack and eat the same day, the street bread ring of Sofia.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-prosenik",
    name: { en: "Bulgarian Cornbread with Cheese (Prosenik)", hindi: "बुल्गारियाई मकई ब्रेड पनीर (प्रोसेनिक)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 300 }, // cornmeal
      { foodId: "usda-168936", grams: 100 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 250 }, // plain yogurt
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-328841", grams: 150 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Stir the cornmeal and flour together with the salt in a large bowl.",
      "Whisk the yogurt with the eggs and the sunflower oil and pour it into the dry mixture.",
      "Stir just until combined into a thick batter, cornmeal batter toughens if it is beaten.",
      "Fold in the crumbled cottage cheese.",
      "Pour the batter into a greased baking pan and level the top.",
      "Bake in the oven at 190°C for about 30 minutes until golden and firm.",
      "Serve warm in squares with yogurt or a bean stew, the corn bread of the northern villages.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-chesnova-pitka",
    name: { en: "Bulgarian Garlic Cheese Bread (Chesnova Pitka)", hindi: "बुल्गारियाई लहसुन पनीर ब्रेड (चेस्नोवा पित्का)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 500 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-328841", grams: 100 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Work the flour with the yogurt, the egg and the salt into a soft dough; knead 5 minutes and rest 30 minutes.",
      "Melt the butter and stir in the crushed garlic.",
      "Roll the dough into a large rectangle and brush it all over with the garlic butter.",
      "Scatter the crumbled cottage cheese over and roll the rectangle up.",
      "Cut the roll into thick rounds and pack them upright in a buttered round pan.",
      "Bake in the oven at 190°C for about 30 minutes until risen and deep golden.",
      "Serve warm, pulled apart at the table, the garlic bread of the Bulgarian feast.",
    ],
    timeMinutes: 55,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  /* -------------------------------- desserts -------------------------------- */
  {
    id: "dish-bg2-revane",
    name: { en: "Bulgarian Semolina Syrup Cake (Revane)", hindi: "बुल्गारियाई सूजी चाशनी केक (रेवाने)" },
    category: "dessert",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-168933", grams: 250 }, // semolina
      { foodId: "usda-168936", grams: 100 }, // refined wheat flour
      { foodId: "usda-171287", grams: 150 }, // eggs
      { foodId: "usda-2259793", grams: 200 }, // plain yogurt
      { foodId: "usda-334247", grams: 200 }, // sugar, cake and syrup together
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-167746", grams: 40 }, // lemon, for the syrup
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Whisk the eggs with a third of the sugar until pale, then whisk in the yogurt and the sunflower oil.",
      "Fold in the semolina, flour and salt and rest the batter 15 minutes so the semolina swells.",
      "Pour the batter into a greased baking pan and bake in the oven at 180°C for about 30 minutes until golden and firm.",
      "Meanwhile simmer the remaining sugar with 250 ml of water and the lemon juice for 5 minutes to a light syrup.",
      "Cut the hot cake into diamonds in its pan.",
      "Pour the warm syrup slowly over the hot cake until it is all drunk in.",
      "Cool completely before serving, revane is a cake that must drink and rest.",
    ],
    timeMinutes: 50,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-tolumbichki",
    name: { en: "Bulgarian Fried Syrup Dough (Tolumbichki)", hindi: "बुल्गारियाई तली चाशनी मिठाई (तोलुम्बिच्की)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 200 }, // refined wheat flour
      { foodId: "usda-168933", grams: 50 }, // semolina
      { foodId: "usda-171287", grams: 150 }, // eggs
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-171025", grams: 100 }, // sunflower oil, for frying
      { foodId: "usda-334247", grams: 250 }, // sugar, for the syrup
      { foodId: "usda-167746", grams: 30 }, // lemon, for the syrup
    ],
    method: [
      "Simmer the sugar with 300 ml of water and the lemon juice for 8 minutes to a syrup; cool it completely, tolumbichki go from hot oil into cold syrup.",
      "Bring 250 ml of water to a boil with the butter, tip in the flour and semolina at once and stir hard over the heat for 2 minutes until the dough leaves the pan in a ball.",
      "Cool the dough 5 minutes, then beat in the eggs one at a time to a smooth, thick, pipeable paste.",
      "Heat the sunflower oil in a deep pan to a moderate frying heat.",
      "Pipe or spoon short ridged lengths of the paste into the oil and fry, turning them, until deep golden all over, about 5 minutes a batch.",
      "Lift the hot tolumbichki straight into the cold syrup and leave them 10 minutes to drink.",
      "Serve at room temperature, crisp outside and soaked within, the syrup fritters of the sweet shops.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-oriz-s-mlyako",
    name: { en: "Bulgarian Rice Pudding (Oriz s Mlyako)", hindi: "बुल्गारियाई चावल खीर (ओरिज़ स मल्याको)" },
    category: "dessert",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 120 }, // white rice
      { foodId: "usda-322892", grams: 700 }, // whole milk
      { foodId: "usda-334247", grams: 80 }, // sugar
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-167746", grams: 10 }, // lemon, its zest in the method
    ],
    method: [
      "Rinse the rice and simmer it in 250 ml of water for 10 minutes until the water is drunk.",
      "Pour in the milk and add a strip of the lemon zest.",
      "Simmer very gently, stirring often so the bottom never catches, for about 25 minutes until the rice is soft and the pudding is thick and creamy.",
      "Stir in the sugar and simmer 3 minutes more; remove the lemon zest.",
      "Pour the pudding into small bowls.",
      "Dust the tops with the cinnamon and serve warm or cold, the rice pudding of every Bulgarian childhood.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-krem-karamel",
    name: { en: "Bulgarian Creme Caramel (Krem Karamel)", hindi: "बुल्गारियाई क्रीम कैरामेल (क्रेम कारामेल)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-322892", grams: 600 }, // whole milk
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-334247", grams: 180 }, // sugar, caramel and custard together
    ],
    method: [
      "Melt two thirds of the sugar in a dry heavy pan over medium heat, without stirring, until it turns a deep amber caramel.",
      "Divide the caramel quickly between six small ramekins, tilting each to coat its base; it hardens in moments.",
      "Warm the milk with the remaining sugar until the sugar dissolves, never boiling it.",
      "Whisk the eggs in a bowl and pour the warm milk over them slowly, whisking all the time; strain the custard.",
      "Fill the ramekins with the custard and stand them in a roasting pan of hot water.",
      "Bake in the oven at 160°C for about 35 minutes until the custards are just set with a wobble at the centre.",
      "Cool the ramekins, then chill them in the fridge for at least 4 hours; turn each out onto a plate so the caramel runs over as sauce.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven", "fridge"],
  },
  {
    id: "dish-bg2-ashure-style",
    name: { en: "Bulgarian Grain and Nut Dessert (Ashure-Style)", hindi: "बुल्गारियाई अनाज मेवा मिठाई (आशुरे)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-170284", grams: 200 }, // pearled barley, standing in for the wheat berries
      { foodId: "usda-2346394", grams: 80 }, // walnuts
      { foodId: "usda-2346393", grams: 50 }, // almonds
      { foodId: "usda-174683", grams: 150 }, // grapes
      { foodId: "usda-171688", grams: 150 }, // apple
      { foodId: "usda-746771", grams: 100 }, // orange
      { foodId: "usda-334247", grams: 100 }, // sugar
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-167746", grams: 20 }, // lemon
    ],
    method: [
      "Soak the barley overnight; the -Style is for barley standing in for ashure's wheat berries, the set's whole cooking grain for the wheat it does not carry whole.",
      "Drain the barley, cover with fresh water and boil gently for about 45 minutes until the grains are tender and the liquid turns milky and thick.",
      "Stir in the sugar, the lemon juice and half the cinnamon and simmer 10 minutes.",
      "Chop the walnuts and almonds coarsely and stir most of them into the pot.",
      "Cut the apple and orange into small pieces and stir them in with the grapes off the heat.",
      "Pour the ashure into bowls, scatter the remaining nuts and cinnamon over, and serve warm or cold, the harvest dessert shared with neighbours.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-gris-halva",
    name: { en: "Bulgarian Semolina Halva (Gris Halva)", hindi: "बुल्गारियाई सूजी हलवा (ग्रीस हलवा)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168933", grams: 250 }, // semolina
      { foodId: "usda-173410", grams: 60 }, // butter
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-322892", grams: 300 }, // whole milk, for the syrup
      { foodId: "usda-334247", grams: 180 }, // sugar
      { foodId: "usda-2346394", grams: 60 }, // walnuts
      { foodId: "usda-171320", grams: 2 }, // cinnamon
    ],
    method: [
      "Simmer the milk with the sugar for 3 minutes to a syrup and keep it warm.",
      "Melt the butter with the sunflower oil in a wide heavy pan.",
      "Add the semolina and stir over medium heat, without stopping, for about 10 minutes until it turns a deep golden colour and smells of nuts.",
      "Add the chopped walnuts and stir 1 minute.",
      "Pour the hot syrup carefully over the semolina, it will spit and steam, and stir hard until it is all drunk in and the halva leaves the pan in a mass.",
      "Cover and rest 10 minutes, then press the halva into a dish, dust with the cinnamon and serve warm in slices.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-banitsa-yabalki",
    name: { en: "Bulgarian Apple Banitsa (Banitsa s Yabalki)", hindi: "बुल्गारियाई सेब बानित्सा (बानित्सा स याबाल्की)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-171688", grams: 600 }, // apples
      { foodId: "usda-2346394", grams: 100 }, // walnuts
      { foodId: "usda-334247", grams: 80 }, // sugar
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the dough
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Work the flour with 200 ml of water, the sunflower oil and the salt into a smooth dough; rest it 30 minutes.",
      "Grate the apples coarsely and squeeze them lightly; stir in the sugar, cinnamon and chopped walnuts.",
      "Roll the dough into thin sheets on a floured cloth.",
      "Brush a sheet with melted butter, scatter the apple mixture along it and roll it up loosely; coil the rolls into a buttered round pan.",
      "Repeat with the remaining sheets and filling and brush the whole banitsa with butter.",
      "Bake in the oven at 190°C for about 35 minutes until deep golden and crisp.",
      "Rest 10 minutes, dust with a little more sugar if the table likes it, and serve warm, the autumn banitsa.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-pecheni-yabalki",
    name: { en: "Bulgarian Baked Apples with Walnuts and Honey (Pecheni Yabalki)", hindi: "बुल्गारियाई बेक्ड सेब अखरोट शहद (पेचेनी याबाल्की)" },
    category: "dessert",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171688", grams: 600 }, // apples
      { foodId: "usda-2346394", grams: 80 }, // walnuts
      { foodId: "usda-169640", grams: 60 }, // honey
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-173410", grams: 20 }, // butter
    ],
    method: [
      "Core the apples from the top, leaving their bases intact so the filling stays in.",
      "Chop the walnuts and stir them with the honey and cinnamon.",
      "Fill each apple's hollow generously with the walnut mixture and dot with the butter.",
      "Stand the apples in a baking dish with a splash of water in its base.",
      "Bake in the oven at 180°C for about 30 minutes until the apples are soft and their skins split.",
      "Serve warm with their honeyed juices spooned over, the simplest baked dessert of the house.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg2-kiselo-mlyako-med",
    name: { en: "Bulgarian Yogurt with Honey and Walnuts (Kiselo Mlyako s Med i Orehi)", hindi: "बुल्गारियाई दही शहद अखरोट (किसेलो मल्याको)" },
    category: "dessert",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2259793", grams: 600 }, // plain yogurt, the kiselo mlyako
      { foodId: "usda-169640", grams: 80 }, // honey
      { foodId: "usda-2346394", grams: 60 }, // walnuts
    ],
    method: [
      "Spoon the yogurt into four small bowls in soft mounds, unwhisked, as it comes from the pot.",
      "Chop the walnuts coarsely.",
      "Pour the honey over each bowl of yogurt in slow ribbons.",
      "Scatter the walnuts over the top.",
      "Chill the bowls in the fridge for 20 minutes so the honey firms against the cold yogurt.",
      "Serve straight from the fridge, the dessert Bulgaria makes from its most famous food, and the simplest on this shelf.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg2-maslenki",
    name: { en: "Bulgarian Butter Cookies (Maslenki)", hindi: "बुल्गारियाई मक्खन कुकीज़ (मास्लेन्की)" },
    category: "dessert",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour
      { foodId: "usda-173410", grams: 200 }, // butter
      { foodId: "usda-334247", grams: 100 }, // sugar
      { foodId: "usda-2346394", grams: 80 }, // walnuts, ground into the dough
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-171320", grams: 2 }, // cinnamon
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Rub the butter into the flour with the sugar, cinnamon and salt until the mixture looks like breadcrumbs.",
      "Stir in the finely ground walnuts.",
      "Add the egg and work the mixture just into a soft dough; rest it in the fridge for 30 minutes.",
      "Roll the dough out to the thickness of a finger and cut it into rounds or crescents.",
      "Lay the cookies on a baking tray, leaving room between them.",
      "Bake in the oven at 170°C for about 15 minutes until pale gold at the edges, maslenki are never browned.",
      "Cool on the tray, they are fragile while warm, and serve with coffee or tea, the Christmas cookie of the house.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven", "fridge"],
  },
  /* --------------------------------- drinks --------------------------------- */
  {
    id: "dish-bg2-boza-style",
    name: { en: "Bulgarian Fermented Wheat Drink (Boza-Style)", hindi: "बुल्गारियाई किण्वित गेहूँ पेय (बोज़ा)" },
    category: "drink",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168893", grams: 120 }, // whole-grain wheat flour
      { foodId: "usda-334247", grams: 100 }, // sugar
      { foodId: "usda-2259793", grams: 30 }, // plain yogurt, standing in for the boza culture as starter
      { foodId: "usda-173468", grams: 1 }, // salt
    ],
    method: [
      "Toast the flour in a dry heavy pan over medium heat, stirring constantly, for about 8 minutes until it turns golden and smells nutty; the -Style is for the yogurt starter standing in for boza's own culture.",
      "Whisk the toasted flour with 1 litre of water in a pot until smooth, then simmer gently for 15 minutes, stirring, to a thin porridge.",
      "Stir in the sugar and salt and cool the mixture until it is just warm to the hand.",
      "Whisk in the yogurt, cover the pot with a cloth and leave it in a warm corner for about 24 hours to ferment until it turns pleasantly sharp and slightly thick.",
      "Whisk the boza smooth, pour it into bottles and chill it in the fridge.",
      "Serve cold in tall glasses, thick and tangy, the old drink of the bozadzhiya shops.",
    ],
    timeMinutes: 40,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-chai-menta",
    name: { en: "Bulgarian Mint Tea (Chai ot Menta)", hindi: "बुल्गारियाई पुदीना चाय (चाय ओत मेंता)" },
    category: "drink",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173475", grams: 20 }, // spearmint, fresh
      { foodId: "usda-169640", grams: 40 }, // honey
    ],
    method: [
      "Rinse the spearmint sprigs and bruise them lightly in the bottom of a teapot.",
      "Bring 800 ml of water to a boil and pour it over the mint.",
      "Cover and steep for 10 minutes until the tea is fragrant and pale green.",
      "Strain the tea into cups.",
      "Stir in the honey to the table's taste.",
      "Serve hot in winter or over ice in summer, the mint tea of the mountain villages.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-limonada",
    name: { en: "Bulgarian Homemade Lemonade (Limonada)", hindi: "बुल्गारियाई घर की नींबू पानी (लिमोनादा)" },
    category: "drink",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-167746", grams: 200 }, // lemons
      { foodId: "usda-334247", grams: 80 }, // sugar
      { foodId: "usda-173475", grams: 10 }, // spearmint
    ],
    method: [
      "Roll the lemons hard on the board to free their juice, then squeeze them.",
      "Stir the sugar into 200 ml of water until it dissolves completely, a cold syrup.",
      "Combine the lemon juice and syrup in a jug and top up with 600 ml of cold water.",
      "Tear the spearmint leaves, bruise them lightly and stir them into the lemonade.",
      "Rest the jug 30 minutes so the mint perfumes the drink.",
      "Serve over ice with a lemon slice in each glass, the lemonade of the garden cafes.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  /* --------------------------------- snacks --------------------------------- */
  {
    id: "dish-bg2-panirano-sirene",
    name: { en: "Bulgarian Breaded Fried Cheese (Panirano Sirene)", hindi: "बुल्गारियाई ब्रेडेड तला पनीर (पानिरानो सिरेने)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-328637", grams: 400 }, // cheddar, standing in for the kashkaval of the classic
      { foodId: "usda-168936", grams: 60 }, // refined wheat flour, for the crust
      { foodId: "usda-171287", grams: 100 }, // eggs, for the crust
      { foodId: "usda-171025", grams: 80 }, // sunflower oil, for frying
    ],
    method: [
      "Cut the cheddar into thick fingers or slabs and chill them in the fridge for 30 minutes, cold cheese survives the pan.",
      "Spread the flour on one plate and whisk the eggs in a shallow dish.",
      "Coat each piece of cheese in flour, then in egg, then in flour again, the double crust that keeps the cheese in.",
      "Heat the sunflower oil in a wide pan until shimmering.",
      "Fry the cheese pieces, turning once, until the crust is deep golden, about 3 minutes in all, and no longer, the cheese is already melting.",
      "Serve at once with a salad or a spoon of jam, the breaded cheese that starts a thousand Bulgarian meals out.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-kartofeni-kyufteta",
    name: { en: "Bulgarian Potato Patties (Kartofeni Kyufteta)", hindi: "बुल्गारियाई आलू टिक्की (कार्तोफ़ेनी क्युफ़्तेता)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 600 }, // potatoes
      { foodId: "usda-328841", grams: 150 }, // cottage cheese, standing in for sirene
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171287", grams: 50 }, // egg, the binder
      { foodId: "usda-168936", grams: 50 }, // refined wheat flour, the coating
      { foodId: "usda-171025", grams: 70 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Boil the potatoes in their skins until tender; drain, peel and mash them while warm, then cool the mash.",
      "Stir the crumbled cottage cheese, finely chopped onion, the egg, coriander leaves and salt into the mash.",
      "Shape the mixture into flat patties with wet hands and roll each in the flour.",
      "Rest the patties in the fridge for 20 minutes to firm up.",
      "Fry the patties in the sunflower oil until deep golden on both sides, about 8 minutes in all.",
      "Serve with a yogurt sauce or a tomato salad, the potato kyufteta of the meatless days.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg2-printsesa",
    name: { en: "Bulgarian Mince and Cheese Toasts (Printsesa)", hindi: "बुल्गारियाई कीमा पनीर टोस्ट (प्रिन्त्सेसा)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 300 }, // refined wheat flour, for the loaf baked in the method
      { foodId: "usda-2514745", grams: 300 }, // ground pork, the printsesa mince
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-328637", grams: 120 }, // cheddar, standing in for kashkaval
      { foodId: "usda-173410", grams: 30 }, // butter, for the bread
      { foodId: "usda-170923", grams: 2 }, // cumin
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Work the flour with 180 ml of water and a pinch of the salt into a dough, shape a small loaf and bake in the oven at 190°C for about 25 minutes; cool it and cut thick slices, printsesa being a toast before it is anything else.",
      "Knead the pork mince with the finely grated onion, cumin, the remaining salt and the pepper.",
      "Butter the bread slices lightly.",
      "Spread the raw spiced mince over each slice in an even layer to the very edges, the mince shrinks as it cooks.",
      "Grate the cheddar thickly over the mince.",
      "Bake the printsesi in the oven at 200°C for about 12 minutes until the mince is cooked through and the cheese is golden and bubbling.",
      "Serve at once, the open toast that is Bulgaria's answer to pizza.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg2-gabi-pane",
    name: { en: "Bulgarian Breaded Fried Mushrooms (Panirovani Gabi)", hindi: "बुल्गारियाई ब्रेडेड तले मशरूम (पानिरोवानी गाबी)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 500 }, // mushrooms
      { foodId: "usda-168936", grams: 60 }, // refined wheat flour, for the crust
      { foodId: "usda-171287", grams: 100 }, // eggs, for the crust
      { foodId: "usda-171025", grams: 80 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Wipe the mushrooms clean and cut the large ones in half; salt them lightly.",
      "Spread the flour on one plate and whisk the eggs in a shallow dish.",
      "Coat each mushroom in flour, then in egg, then in flour again.",
      "Heat the sunflower oil in a wide pan until shimmering.",
      "Fry the mushrooms in batches until the crust is deep golden and crisp, about 5 minutes a batch.",
      "Drain for a moment on paper and serve at once with a garlic yogurt sauce, the fried mushrooms of the tavern starter board.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg2-marinovana-skumriya",
    name: { en: "Bulgarian Marinated Mackerel (Marinovana Skumriya)", hindi: "बुल्गारियाई मसालेदार मैकेरल (मारिनोवाना स्कुम्रिया)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 500 }, // Atlantic mackerel
      { foodId: "usda-173469", grams: 100 }, // apple cider vinegar, the marinade
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170917", grams: 2 }, // bay leaves
      { foodId: "usda-173468", grams: 8 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the mackerel into thick steaks, salt them well and leave them 2 hours in the fridge so the flesh firms.",
      "Rinse the salt off the fish and pat it dry.",
      "Slice the onion into rings and layer it with the fish and the bay leaves in a glass dish.",
      "Stir the vinegar with the sunflower oil, lemon juice and black pepper and pour it over the fish until covered.",
      "Cover the dish and keep it in the fridge for at least 24 hours, the vinegar marinade curing the fish as a pickle cures.",
      "Serve the mackerel cold with its onion rings and bread, the marinated fish of the Black Sea coast.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg2-panirovani-pileshki",
    name: { en: "Bulgarian Breaded Chicken Bites (Panirovani Pileshki Kasove)", hindi: "बुल्गारियाई ब्रेडेड चिकन बाइट्स (पानिरोवानी पिलेश्की)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-168936", grams: 60 }, // refined wheat flour, for the crust
      { foodId: "usda-171287", grams: 100 }, // eggs, for the crust
      { foodId: "usda-171025", grams: 80 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cut the chicken breast into bite-size pieces and season with the salt and pepper.",
      "Spread the flour on one plate and whisk the eggs in a shallow dish.",
      "Coat each chicken piece in flour, then in egg, then in flour again.",
      "Heat the sunflower oil in a wide pan until shimmering.",
      "Fry the chicken bites in batches, turning them, until deep golden and cooked through, about 6 minutes a batch.",
      "Drain for a moment on paper and serve at once with a yogurt and garlic sauce, the breaded bites of the tavern board.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
];
