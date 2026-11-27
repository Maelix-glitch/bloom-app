/**
 * Bulgarian wave — the classic Bulgarian table, composed from the
 * verified reference foods: salads and spreads, chorba soups, clay-pot
 * stews, the grill, banitsa in its forms, and the sweet and sour
 * drinks of the house.
 *
 * Honesty rules, the same as the rest of the library: lines name only
 * the verified reference foods (usda ids); nutrition exists only as
 * `dishNutrients` computes it; no dish carries a hand-written nutrient
 * value. Bulgarian cooking leans on a handful of ingredients the
 * verified set does not carry, and each is handled the library's way —
 * a named stand-in in the lines, stated here and in the line comments,
 * never a silent swap:
 *   · sirene, the brined white cheese of shopska, banitsa and
 *     mish-mash, is costed through cottage cheese, the library's fresh
 *     white cheese (the same stand-in the paneer dishes use);
 *   · kiselo mlyako, Bulgarian yogurt, is costed through the set's
 *     plain yogurt, and its strained form through Greek yogurt;
 *   · dill and parsley, which the set does not carry, are stood in for
 *     by fresh coriander leaves (the X-4 precedent);
 *   · leeks are stood in for by onion (the leek banitsa is named
 *     -Style for exactly this reason);
 *   · banitsa and baklava sheets are rolled by hand from refined
 *     wheat flour, water and oil — no filo product exists in the set;
 *   · the tikvenik's pumpkin is stood in for by sweet potato, and the
 *     pie is named -Style with the substitution stated in its method;
 *   · vine leaves are not in the set, so sarmi here are the cabbage
 *     (zelevi) form only.
 * No beef and no pork, as in every wave (a deliberate programme
 * omission): the grill and the mince dishes are lamb and turkey, and
 * the meat is named in the dish's name wherever the classic is a
 * pork or mixed mince. Two classics could not be composed honestly
 * and are NOT here: kozunak (the verified set carries no yeast) and
 * kapama (no sauerkraut, and its meats are the omitted ones). The
 * tripe of shkembe chorba is likewise absent — what ships instead is
 * the genuine Lenten mushroom version, named -Style.
 *
 * Every dish carries cuisine: "international" and a Devanagari
 * transliteration of its name in name.hindi, like the rest of the
 * international shelf; the Bulgarian original rides in the English
 * name in its Latin transliteration, as the Georgian and Armenian
 * dishes of X-4 carry theirs.
 */

import type { Dish } from "../dishes";

export const BULGARIA_DISHES: readonly Dish[] = [
  /* --------------------------- salads & sides --------------------------- */
  {
    id: "dish-bg-shopska-salata",
    name: { en: "Bulgarian Tomato and Cucumber Salad (Shopska Salata)", hindi: "बुल्गारियाई टमाटर और खीरा सलाद (शोप्सका सलाता)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170457", grams: 600 }, // tomatoes
      { foodId: "usda-2346406", grams: 400 }, // cucumber
      { foodId: "usda-170427", grams: 200 }, // green pepper
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-328841", grams: 200 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Chop the tomatoes into wedges and the cucumber into thick half-moons; slice the green pepper into strips and the onion into fine half-rings.",
      "Salt the onion lightly and rub it with your fingers for a few seconds to take off its raw bite, then rinse and drain.",
      "Put the tomatoes, cucumber, pepper and onion in a wide bowl and season with the salt.",
      "Pour over the sunflower oil and the vinegar and toss gently, shopska is dressed plainly, never drowned.",
      "Crumble the cottage cheese coarsely over the top in a thick white cap, do not mix it in.",
      "Scatter the coriander leaves over the cheese and serve at once, while the vegetables are still crisp.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  {
    id: "dish-bg-ovcharska-salata",
    name: { en: "Bulgarian Shepherd's Salad with Egg and Mushroom (Ovcharska Salata)", hindi: "बुल्गारियाई शेफर्ड सलाद (ओवचार्सका सलाता)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170457", grams: 500 }, // tomatoes
      { foodId: "usda-2346406", grams: 300 }, // cucumber
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-173424", grams: 100 }, // boiled eggs
      { foodId: "usda-328637", grams: 100 }, // cheddar, standing in for kashkaval
      { foodId: "usda-328841", grams: 100 }, // cottage cheese, standing in for sirene
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the mushrooms and sear them in a dry hot pan for 4 minutes until golden at the edges; let them cool completely.",
      "Chop the tomatoes and cucumber into chunks, the pepper into strips and the onion into fine half-rings.",
      "Cut the boiled eggs into wedges and the cheddar into small cubes.",
      "Combine the vegetables, mushrooms, cheddar and cottage cheese in a wide bowl with the salt.",
      "Dress with the sunflower oil and vinegar and toss once, gently.",
      "Lay the egg wedges over the top and serve, the shepherd's salad is shopska made generous.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-snezhanka",
    name: { en: "Bulgarian Strained Yogurt and Cucumber Salad (Snezhanka)", hindi: "बुल्गारियाई दही खीरा सलाद (स्नेझांका)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 600 }, // Greek yogurt, the strained kiselo mlyako
      { foodId: "usda-2346406", grams: 400 }, // cucumber
      { foodId: "usda-2346394", grams: 40 }, // walnuts
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for dill
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Dice the cucumber small, salt it, and leave it in a sieve for 20 minutes; squeeze out the water by the handful, a wet snezhanka is a failed one.",
      "Crush the garlic to a paste with a pinch of the salt.",
      "Stir the garlic into the Greek yogurt with the sunflower oil until smooth and glossy.",
      "Fold in the cucumber and half the coriander leaves.",
      "Chop the walnuts coarsely and fold in half of them; chill the salad for at least 30 minutes.",
      "Serve cold, crowned with the remaining walnuts and coriander, it should stand in soft white mounds like its name, snow white.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg-lyutenitsa",
    name: { en: "Bulgarian Roasted Pepper and Tomato Spread (Lyutenitsa)", hindi: "बुल्गारियाई भुनी मिर्च टमाटर स्प्रेड (ल्युतेनित्सा)" },
    category: "chutney",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-170108", grams: 800 }, // red peppers
      { foodId: "usda-170457", grams: 500 }, // tomatoes
      { foodId: "usda-2685577", grams: 300 }, // eggplant
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-173468", grams: 8 }, // salt
      { foodId: "usda-170932", grams: 2 }, // cayenne, a whisper of heat
    ],
    method: [
      "Roast the red peppers and the eggplant under a hot grill or over flame until their skins blacken and blister, about 15 minutes, turning them.",
      "Cover and rest 10 minutes, then peel away the skins and remove the pepper seeds; the flesh should be soft and smoky.",
      "Blanch the tomatoes for 1 minute, peel them, and chop the flesh; grate the carrot finely.",
      "Blend or pound the pepper and eggplant flesh with the tomatoes to a coarse, rustic puree, lyutenitsa is never silky.",
      "Cook the puree in a wide pan with the sunflower oil, carrot, garlic, sugar, salt and cayenne for 30 minutes, stirring often, until it thickens and the oil glistens at the edges.",
      "Taste for salt and sweetness, cool, and serve spread thickly on bread or beside grilled dishes; it keeps a week in the fridge.",
    ],
    timeMinutes: 60,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-bg-kyopolou",
    name: { en: "Bulgarian Eggplant and Pepper Relish (Kyopolou)", hindi: "बुल्गारियाई बैंगन मिर्च रेलिश (क्योपोलू)" },
    category: "chutney",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 600 }, // eggplant
      { foodId: "usda-170427", grams: 300 }, // green peppers
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
      { foodId: "usda-173469", grams: 20 }, // apple cider vinegar
      { foodId: "usda-169997", grams: 15 }, // coriander leaves, standing in for parsley
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Roast the eggplant and both peppers under a hot grill until the skins blacken and the flesh collapses, about 18 minutes.",
      "Rest them covered for 10 minutes, peel off the skins, and pull out the pepper seeds and cores.",
      "Chop the roasted flesh coarsely with a knife, kyopolou keeps its texture, and drain off any bitter juices.",
      "Grate the tomatoes and cook them down in a pan for 8 minutes to a thick sauce.",
      "Combine the chopped flesh with the tomato, crushed garlic, sunflower oil, vinegar, salt and coriander leaves.",
      "Rest at least 1 hour for the flavours to marry, then serve at room temperature with bread or grilled meats.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-zeleva-salata",
    name: { en: "Bulgarian Cabbage and Carrot Salad (Zeleva Salata)", hindi: "बुल्गारियाई पत्तागोभी गाजर सलाद (ज़ेलेवा सलाता)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346407", grams: 600 }, // cabbage
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173469", grams: 20 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Shred the cabbage as fine as your knife allows and grate the carrot on the coarse side.",
      "Salt the cabbage and knead it firmly with your hands for a minute, until it softens and gives up a little juice.",
      "Add the carrot and coriander leaves and toss through.",
      "Dress with the sunflower oil and vinegar and toss again.",
      "Rest 15 minutes so the cabbage relaxes into the dressing.",
      "Serve crisp and bright, the everyday salad of the Bulgarian winter table.",
    ],
    timeMinutes: 10,
    budgetTier: 1,
    enriched: false,
    equipment: [],
    noCook: true,
  },
  {
    id: "dish-bg-kartofena-salata",
    name: { en: "Bulgarian Potato Salad with Onion (Kartofena Salata)", hindi: "बुल्गारियाई आलू सलाद (कार्तोफ़ेना सलाता)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 800 }, // potatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173469", grams: 25 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Boil the potatoes whole in their skins in salted water for about 20 minutes, until a knife slides in without resistance.",
      "Drain and, while still warm, peel them and cut into bite-size chunks; warm potato drinks in the dressing.",
      "Slice the onion into fine half-rings and separate them.",
      "Whisk the sunflower oil, vinegar, salt and black pepper into a dressing and pour it over the warm potatoes.",
      "Fold in the onion and coriander leaves gently so the chunks keep their shape.",
      "Rest 20 minutes and serve warm or at room temperature, never fridge-cold.",
    ],
    timeMinutes: 35,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg-pecheni-chushki",
    name: { en: "Bulgarian Roasted Peppers with Garlic (Pecheni Chushki)", hindi: "बुल्गारियाई भुनी मिर्च लहसुन (पेचेनी चुश्की)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170108", grams: 700 }, // red peppers
      { foodId: "usda-170427", grams: 300 }, // green peppers
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173469", grams: 25 }, // apple cider vinegar
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Roast the peppers whole under a hot grill or over flame until the skins blacken all over, about 15 minutes, turning them.",
      "Seal them in a covered bowl for 10 minutes so the steam loosens the skins.",
      "Peel off the skins, pull out the stems and seeds, and tear the flesh into wide strips.",
      "Crush the garlic with the salt and stir it into the sunflower oil and vinegar.",
      "Pour the dressing over the warm pepper strips and toss gently.",
      "Rest at least 30 minutes and serve at room temperature, with bread to catch the juices.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-marinovani-gabi",
    name: { en: "Bulgarian Marinated Mushrooms (Marinovani Gabi)", hindi: "बुल्गारियाई मसालेदार मशरूम (मारिनोवानी गाबी)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 600 }, // mushrooms
      { foodId: "usda-173469", grams: 60 }, // apple cider vinegar
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Wipe the mushrooms clean and halve or quarter the large ones so all the pieces are one bite.",
      "Simmer them in salted water for 8 minutes, until just tender, then drain well.",
      "Warm the vinegar with the sunflower oil, crushed garlic, salt and black pepper until it steams, do not boil it hard.",
      "Pour the hot marinade over the mushrooms and toss them through it.",
      "Cool, cover, and rest in the fridge for at least 4 hours, better overnight.",
      "Serve cold with the coriander leaves scattered over, a standing mezze of the winter table.",
    ],
    timeMinutes: 20,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg-przheni-patladzhani",
    name: { en: "Bulgarian Fried Eggplant with Yogurt Sauce (Pyrzheni Patladzhani)", hindi: "बुल्गारियाई तला बैंगन दही सॉस (पर्झेनी पातलादझानी)" },
    category: "side",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 700 }, // eggplant
      { foodId: "usda-2259793", grams: 300 }, // yogurt
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 60 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for dill
    ],
    method: [
      "Slice the eggplant into rounds about 1 cm thick, salt them, and rest 20 minutes to draw out the bitter juice; pat them dry.",
      "Stir the crushed garlic and a pinch of the salt into the yogurt and chill the sauce.",
      "Heat the sunflower oil in a wide pan and fry the eggplant in batches, about 3 minutes a side, until deep golden and soft.",
      "Drain each batch on paper so the slices stay crisp at the edges.",
      "Lay the hot eggplant on a platter and spoon the cold garlic yogurt over in ribbons.",
      "Scatter the coriander leaves and serve at once, hot slices against cold sauce.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  /* -------------------------------- soups -------------------------------- */
  {
    id: "dish-bg-tarator",
    name: { en: "Bulgarian Chilled Yogurt and Cucumber Soup (Tarator)", hindi: "बुल्गारियाई ठंडा दही खीरा सूप (तारातोर)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2259793", grams: 800 }, // yogurt, the kiselo mlyako
      { foodId: "usda-2346406", grams: 500 }, // cucumber
      { foodId: "usda-2346394", grams: 50 }, // walnuts
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for dill
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Dice the cucumber very small; tarator is eaten with a spoon, so nothing should need chewing down.",
      "Crush the garlic with the salt to a smooth paste.",
      "Whisk the yogurt with about 400 ml of cold water until it pours like a thin soup, the consistency of single cream.",
      "Stir in the garlic paste, the sunflower oil and the cucumber.",
      "Chop the walnuts and the coriander leaves and stir in half of each.",
      "Chill for at least 1 hour and serve ice-cold in bowls, crowned with the remaining walnuts and coriander; on the hottest days Bulgarians drop in an ice cube.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg-bob-chorba",
    name: { en: "Bulgarian White Bean Soup (Bob Chorba)", hindi: "बुल्गारियाई सफ़ेद बीन्स सूप (बॉब चोर्बा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 320 }, // navy beans, dry
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-170427", grams: 100 }, // green pepper
      { foodId: "usda-173475", grams: 10 }, // mint leaves, the chorba's signature herb
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170932", grams: 1 }, // cayenne
    ],
    method: [
      "Soak the navy beans overnight in plenty of water; drain and rinse them in the morning.",
      "Cover with fresh water, bring to the boil, and throw away the first water, the old rule for a clean-tasting chorba; cover again and simmer 45 minutes.",
      "Soften the onion, carrot and green pepper in the sunflower oil for 6 minutes and add them to the beans.",
      "Add the chopped tomatoes, salt and cayenne and simmer 25 minutes more, until the beans are completely tender.",
      "Crush a ladle of beans against the side of the pot and stir them back to thicken the broth slightly.",
      "Tear in the mint leaves at the end, rest 10 minutes, and serve with crusty bread and a sharp green chilli on the side.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-shkembe-gabi-style",
    name: { en: "Bulgarian Mushroom Soup, Shkembe-Style (Shkembe ot Gabi)", hindi: "बुल्गारियाई मशरूम सूप शिकेम्बे-स्टाइल (शिकेम्बे ओट गाबी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 600 }, // mushrooms, the Lenten stand-in for tripe
      { foodId: "usda-322892", grams: 500 }, // whole milk
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-168936", grams: 20 }, // flour, to body the broth
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173469", grams: 20 }, // apple cider vinegar, served with the garlic
      { foodId: "usda-170932", grams: 3 }, // cayenne, for the hot red butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "The classic shkembe is tripe; this is its genuine Lenten twin, made with mushrooms, which Bulgarian kitchens cook the very same way.",
      "Slice the mushrooms thickly and simmer them in about 800 ml of salted water for 15 minutes until tender; keep the broth.",
      "Stir the flour into the milk until smooth, whisk it into the mushroom broth, and simmer 5 minutes until the soup turns silky.",
      "Melt the butter until foaming, stir in the cayenne, and take it off the heat the moment it turns brick red.",
      "Crush the garlic and stir it into the vinegar; this sharp dressing is passed at the table, never cooked in.",
      "Serve the soup steaming, with the red butter swirled over and the garlic vinegar beside it for each eater to dose their own bowl.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-kurban-chorba",
    name: { en: "Bulgarian Lamb and Rice Soup (Kurban Chorba)", hindi: "बुल्गारियाई मेमना चावल सूप (कुर्बान चोर्बा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 500 }, // ground lamb
      { foodId: "usda-2512381", grams: 80 }, // white rice
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-173475", grams: 10 }, // mint leaves
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Break the lamb mince into coarse, walnut-sized pieces and brown them in the sunflower oil for 6 minutes, letting them catch at the edges.",
      "Add the onion and carrot and soften for 5 minutes in the lamb's fat.",
      "Pour in about 1.2 litres of water, add the salt and black pepper, and simmer gently for 25 minutes, skimming any foam.",
      "Add the rice and the chopped tomatoes and simmer 18 minutes more, until the rice is tender and the broth has body.",
      "Taste for salt; a kurban chorba is seasoned simply and served generously.",
      "Tear in the mint leaves, rest 5 minutes, and ladle into deep bowls.",
    ],
    timeMinutes: 60,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-pileshka-supa",
    name: { en: "Bulgarian Chicken Soup with Yogurt Thickener (Pileshka Supa)", hindi: "बुल्गारियाई चिकन सूप (पिलेश्का सुपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-2259793", grams: 100 }, // yogurt, for the zastroyka
      { foodId: "usda-171287", grams: 50 }, // egg, for the zastroyka
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Cover the chicken thigh with about 1.4 litres of cold water, bring slowly to a simmer, and skim the foam for a clear broth.",
      "Add the onion, carrot and salt and simmer 25 minutes; add the potatoes in cubes and cook 15 minutes more.",
      "Lift out the chicken, pull the meat from the bones in bite-size pieces, and return it to the soup.",
      "Whisk the egg with the yogurt and a squeeze of lemon; this is the zastroyka, the thickener that makes the soup Bulgarian.",
      "Temper the zastroyka with a ladle of hot broth, whisking, then stir it into the soup off the boil and warm through gently for 2 minutes, never boiling again.",
      "Serve with the coriander leaves scattered over and the remaining lemon at the table.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-supa-topcheta",
    name: { en: "Bulgarian Meatball Soup (Supa Topcheta)", hindi: "बुल्गारियाई मीटबॉल सूप (सुपा तोपचेता)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 400 }, // ground turkey
      { foodId: "usda-2512381", grams: 100 }, // white rice, half in the balls, half in the soup
      { foodId: "usda-2346401", grams: 250 }, // potatoes
      { foodId: "usda-2258586", grams: 120 }, // carrot
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-2259793", grams: 120 }, // yogurt, for the zastroyka
      { foodId: "usda-171287", grams: 50 }, // egg, for the zastroyka
      { foodId: "usda-168936", grams: 15 }, // flour, to roll the balls
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Mix the turkey mince with half the rice, half the salt and the black pepper; roll walnut-sized balls and dust them lightly in the flour.",
      "Soften the onion and carrot in the sunflower oil for 5 minutes, then pour in about 1.3 litres of water and bring to a simmer.",
      "Add the potatoes in cubes and the remaining rice and simmer 10 minutes.",
      "Lower the meatballs in one by one and simmer gently for 15 minutes, never a hard boil, which would break them.",
      "Whisk the egg with the yogurt, temper it with hot broth, and stir it into the soup off the boil; warm through 2 minutes.",
      "Serve scattered with coriander leaves, the balls tender and the broth softly thickened.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-ribena-chorba",
    name: { en: "Bulgarian Fish Soup (Ribena Chorba)", hindi: "बुल्गारियाई मछली सूप (रिबेना चोर्बा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 500 }, // cod
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-2258586", grams: 100 }, // carrot
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the onion and carrot in the sunflower oil for 5 minutes without colouring them.",
      "Add the potatoes in cubes, about 1.2 litres of water and the salt, and simmer 12 minutes.",
      "Add the chopped tomatoes and simmer 5 minutes more to make the chorba's base.",
      "Cut the cod into large chunks, season with the black pepper, and lower them into the soup.",
      "Simmer the gentlest possible 6 minutes, until the fish just flakes; a hard boil would shred it.",
      "Serve with a squeeze of lemon and the coriander leaves, straight from the pot.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-leshta-supa",
    name: { en: "Bulgarian Red Lentil Soup (Leshta Supa)", hindi: "बुल्गारियाई लाल दाल सूप (लेश्ता सुपा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174284", grams: 320 }, // red lentils
      { foodId: "usda-2258586", grams: 150 }, // carrot
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seeds
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173469", grams: 15 }, // apple cider vinegar, served at the table
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Rinse the red lentils until the water runs clear; they need no soaking.",
      "Soften the onion and carrot in half the sunflower oil for 5 minutes; add the garlic and cumin for the last minute.",
      "Add the lentils, the chopped tomatoes, the salt and about 1.2 litres of water; simmer 25 minutes, until the lentils dissolve into the soup.",
      "Whisk the soup briskly to a rustic puree, or blend half of it and stir it back, leshta keeps some body.",
      "Warm the remaining sunflower oil and swirl it over each bowl.",
      "Serve with the vinegar at the table; a spoonful sharpened into the bowl is the Bulgarian way.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* ------------------------------ clay pots & bakes ------------------------------ */
  {
    id: "dish-bg-gyuvech",
    name: { en: "Bulgarian Lamb and Vegetable Clay-Pot Stew (Gyuvech)", hindi: "बुल्गारियाई मेमना सब्ज़ी स्टू (ग्युवेच)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 500 }, // ground lamb
      { foodId: "usda-2346401", grams: 400 }, // potatoes
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-2685577", grams: 250 }, // eggplant
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-169260", grams: 100 }, // okra
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Break the lamb mince into coarse pieces and brown them hard in the sunflower oil for 6 minutes; lift them out with their juices.",
      "Soften the onion and green pepper in the same pot for 5 minutes.",
      "Layer the potatoes, green beans, eggplant and okra into a clay pot (or a heavy casserole), with the lamb, tomatoes, salt and black pepper between the layers.",
      "Pour over about 300 ml of water, cover, and bake at 180°C for 60 minutes, until every vegetable is tender and the juices have married.",
      "Rest the gyuvech 10 minutes with the lid on; it finishes cooking in its own steam.",
      "Scatter the coriander leaves and serve straight from the clay pot, as it is served in Bulgaria.",
    ],
    timeMinutes: 90,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-lamb-kavarma",
    name: { en: "Bulgarian Minced Lamb Kavarma", hindi: "बुल्गारियाई कीमा मेमना कवार्मा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 680 }, // ground lamb
      { foodId: "usda-790646", grams: 250 }, // onion, standing in for the classic leeks
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-170108", grams: 250 }, // red peppers
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Break the lamb mince into coarse, walnut-sized pieces and brown them in the sunflower oil over high heat for 6 minutes; set aside with their juices.",
      "In the same pot, cook the onion for 6 minutes until soft and sweet at the edges; the classic kavarma uses leeks, and onion is its honest stand-in here.",
      "Add the red peppers and cook 5 minutes, then the mushrooms for 4 minutes, until their liquid evaporates.",
      "Add the tomatoes, salt and black pepper, return the lamb, cover and braise on low heat for 25 minutes.",
      "Uncover and simmer 5 minutes more to a glossy stew; kavarma is finished in clay pots in the oven, and 15 minutes at 180°C does the same work.",
      "Rest 5 minutes and serve straight from the pot with bread.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-musaka",
    name: { en: "Bulgarian Lamb and Potato Musaka", hindi: "बुल्गारियाई मेमना आलू मुसाका" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 600 }, // ground lamb
      { foodId: "usda-2346401", grams: 700 }, // potatoes
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2259793", grams: 200 }, // yogurt, for the topping
      { foodId: "usda-171287", grams: 100 }, // eggs, for the topping
      { foodId: "usda-168936", grams: 20 }, // flour, for the topping
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-170923", grams: 2 }, // cumin seeds, ground in the cooking
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the onion in the sunflower oil for 4 minutes, add the lamb mince, and fry 8 minutes, breaking it fine and letting it colour.",
      "Stir in the chopped tomatoes, cumin, salt and black pepper and simmer 8 minutes to a thick sauce.",
      "Cut the potatoes into small cubes and stir them through the meat; Bulgarian musaka is a potato musaka, not an eggplant one.",
      "Tip everything into a baking dish, level it, pour over about 150 ml of hot water, and bake at 190°C for 35 minutes, until the potato is tender.",
      "Whisk the yogurt with the eggs and flour and a pinch of the salt; spread this zastroyka over the top in an even blanket.",
      "Bake 12 minutes more, until the topping is set and golden in patches; rest 10 minutes before cutting, so the slices stand.",
    ],
    timeMinutes: 75,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-zelevi-sarmi",
    name: { en: "Bulgarian Cabbage Rolls with Lamb and Rice (Zelevi Sarmi)", hindi: "बुल्गारियाई पत्तागोभी रोल (ज़ेलेवी सार्मी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346407", grams: 800 }, // cabbage, whole leaves for wrapping
      { foodId: "usda-174370", grams: 450 }, // ground lamb
      { foodId: "usda-2512381", grams: 180 }, // white rice
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-173475", grams: 8 }, // mint leaves
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-170932", grams: 1 }, // cayenne
    ],
    method: [
      "Blanch the whole cabbage in a large pot of boiling water for 5 minutes, lifting off the leaves as they soften; trim the thick ribs flat.",
      "Soften the onion in half the sunflower oil, add the rice and stir 2 minutes until the grains glisten, then take off the heat.",
      "Mix the lamb with the rice and onion, the mint, salt, black pepper and cayenne; the filling is seasoned before it is wrapped.",
      "Lay a spoonful of filling on each leaf, fold in the sides, and roll up snugly into parcels.",
      "Pack the rolls seam-down in a pot in tight layers, scatter the chopped tomatoes between them, and drizzle the remaining oil.",
      "Cover with water to just below the top layer, weight with a plate, and simmer gently for 45 minutes; serve with their cooking juices.",
    ],
    timeMinutes: 90,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-plneni-chushki",
    name: { en: "Bulgarian Stuffed Peppers with Lamb and Rice (Plneni Chushki)", hindi: "बुल्गारियाई भरी मिर्च (प्लनेनी चुश्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170427", grams: 800 }, // green peppers, about 8 large
      { foodId: "usda-174370", grams: 450 }, // ground lamb
      { foodId: "usda-2512381", grams: 180 }, // white rice
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2259793", grams: 150 }, // yogurt, for the table sauce
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Cut the tops off the peppers and shake out the seeds; keep the tops as lids.",
      "Soften the onion in the sunflower oil, add the rice and stir 2 minutes until glossy, then take off the heat and cool slightly.",
      "Mix the lamb with the rice, half the chopped tomatoes, the salt, black pepper and coriander leaves.",
      "Fill the peppers loosely, the rice needs room to swell, and set their lids back on.",
      "Stand the peppers upright in a pot, pour the remaining tomatoes and about 300 ml of water around them, cover, and simmer 40 minutes.",
      "Serve with the yogurt spooned over, the classic partner to a stuffed pepper.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------------------- the grill --------------------------------- */
  {
    id: "dish-bg-kyufte",
    name: { en: "Bulgarian Grilled Lamb Kyufte", hindi: "बुल्गारियाई ग्रिल्ड मेमना क्युफ़्ते" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 700 }, // ground lamb
      { foodId: "usda-790646", grams: 120 }, // onion, grated
      { foodId: "usda-170923", grams: 4 }, // cumin seeds, ground in the mixing
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the grill
    ],
    method: [
      "Grate the onion finely and squeeze it nearly dry; wet onion makes kyufte split on the grill.",
      "Work the lamb with the onion, cumin, black pepper and salt for a full 2 minutes, until the mixture turns pale and sticky, this is what keeps kyufte springy.",
      "Rest the mixture in the fridge for at least 1 hour, better overnight; cold mince grills cleanly.",
      "With wet hands, form 8 flattened oval patties about 2 cm thick.",
      "Grill on a hot, lightly oiled grill or griddle pan for about 4 minutes a side, turning once, until deeply striped and just cooked through.",
      "Rest 3 minutes and serve with lyutenitsa and a cabbage salad, the standing Bulgarian grill plate.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg-kebapche",
    name: { en: "Bulgarian Grilled Kebapche (Lamb and Turkey)", hindi: "बुल्गारियाई ग्रिल्ड कबापचे (मेमना और टर्की)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 400 }, // ground lamb
      { foodId: "usda-2514747", grams: 300 }, // ground turkey
      { foodId: "usda-170923", grams: 6 }, // cumin seeds, the kebapche spice
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the grill
    ],
    method: [
      "Work the lamb and turkey together with the cumin, black pepper and salt for 2 minutes until the mince turns sticky and uniform.",
      "Rest the mixture in the fridge for at least 1 hour; kebapche holds its shape from cold, well-worked mince, not from binders.",
      "With wet hands, roll the mince into finger-thick sausages about 12 cm long, even thickness end to end so they grill evenly.",
      "Grill on a hot, lightly oiled grill or griddle pan, turning every 2 minutes, about 8 minutes in all, until striped on all sides.",
      "Rest 3 minutes; the juices should run clear and the cumin should perfume the whole plate.",
      "Serve three to a portion with fried potatoes or a shopska salad, the classic Bulgarian grill-house order.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg-karnache-style",
    name: { en: "Bulgarian Lamb Sausages, Karnache-Style", hindi: "बुल्गारियाई मेमना सॉसेज कार्नाचे-स्टाइल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 700 }, // ground lamb
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170932", grams: 4 }, // cayenne, karnache carries heat
      { foodId: "usda-170923", grams: 4 }, // cumin seeds, ground in the mixing
      { foodId: "usda-170931", grams: 3 }, // black pepper
      { foodId: "usda-173468", grams: 7 }, // salt
      { foodId: "usda-171025", grams: 15 }, // sunflower oil, for the grill
    ],
    method: [
      "The classic karnache is a coiled pork sausage; this lamb version keeps its spice and its spiral, and says so in its name.",
      "Work the lamb with the crushed garlic, cayenne, cumin, black pepper and salt for 2 minutes until sticky.",
      "Rest in the fridge for at least 1 hour so the spices bloom into the meat.",
      "Roll the mince into one long rope about 2 cm thick, then coil it into a flat spiral, the karnache's signature.",
      "Grill the coil on a hot, lightly oiled grill or griddle pan for about 6 minutes a side, turning once with two spatulas so the spiral holds.",
      "Rest 3 minutes, cut the coil into lengths, and serve with bean salad or lyutenitsa.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg-tatarsko-kyufte",
    name: { en: "Bulgarian Stuffed Lamb Meatball (Tatarsko Kyufte)", hindi: "बुल्गारियाई भरा मेमना मीटबॉल (तातार्सको क्युफ़्ते)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 700 }, // ground lamb
      { foodId: "usda-173424", grams: 100 }, // boiled eggs, the filling
      { foodId: "usda-328637", grams: 80 }, // cheddar, standing in for kashkaval, the filling
      { foodId: "usda-790646", grams: 120 }, // onion, grated
      { foodId: "usda-170923", grams: 3 }, // cumin seeds, ground in the mixing
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
    ],
    method: [
      "Work the lamb with the grated, squeezed onion, cumin, black pepper and salt for 2 minutes; rest in the fridge for 30 minutes.",
      "Cut the boiled eggs into quarters and the cheddar into small cubes; this is the treasure the meatball hides.",
      "Flatten a handful of mince in your palm, lay in a piece of egg and a few cheese cubes, and close the meat around them into a large ball, sealing every seam.",
      "Make 4 large stuffed balls, one to a portion; a tatarsko kyufte is a main course in itself.",
      "Sear the balls in the sunflower oil in an ovenproof pan for 4 minutes, then bake at 190°C for 18 minutes, until cooked through and the cheese melts inside.",
      "Rest 5 minutes and cut one open at the table, the egg and cheese should spill from the centre.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven", "fridge"],
  },
  {
    id: "dish-bg-rulo-stefani",
    name: { en: "Bulgarian Meatloaf Roll with Eggs (Rulo Stefani)", hindi: "बुल्गारियाई मीटलोफ़ रोल (रूलो स्टेफ़ानी)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 700 }, // ground lamb
      { foodId: "usda-171287", grams: 100 }, // eggs, worked into the mince
      { foodId: "usda-173424", grams: 100 }, // boiled eggs, the roll's spine
      { foodId: "usda-2258586", grams: 120 }, // carrot, boiled for the filling
      { foodId: "usda-2346406", grams: 100 }, // cucumber, quick-pickled for the filling
      { foodId: "usda-173469", grams: 20 }, // apple cider vinegar, for the quick pickle
      { foodId: "usda-328637", grams: 60 }, // cheddar, standing in for kashkaval
      { foodId: "usda-790646", grams: 100 }, // onion, grated
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-171025", grams: 15 }, // sunflower oil
    ],
    method: [
      "Cut the cucumber into batons and toss them in the vinegar with a pinch of the salt for 15 minutes; this quick pickle stands in for the roll's classic gherkins.",
      "Boil the carrot in batons for 6 minutes until just tender; drain the cucumber.",
      "Work the lamb with the raw eggs, grated onion, black pepper and remaining salt; spread it on oiled foil into a rectangle about 2 cm thick.",
      "Lay a line of boiled eggs down the centre, with the carrot, cucumber and cheddar cubes along them.",
      "Roll the meat up around the filling with the foil's help, seal the seam underneath, and place it seam-down in an oiled baking dish.",
      "Bake at 190°C for 40 minutes, until firm and golden; rest 10 minutes and slice thickly so every slice shows the egg at its heart.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* ------------------------------- chicken & beans ------------------------------- */
  {
    id: "dish-bg-pile-s-oriz",
    name: { en: "Bulgarian Baked Chicken with Rice (Pile s Oriz)", hindi: "बुल्गारियाई बेक्ड चिकन चावल (पिले स ओरिज़)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-2512381", grams: 320 }, // white rice
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Brown the chicken thigh pieces in the sunflower oil for 6 minutes until golden; set them aside and keep the pan juices.",
      "Soften the onion in the same pan for 4 minutes, add the rice, and stir 2 minutes until every grain glistens.",
      "Tip the rice into a baking dish, pour over about 700 ml of hot water, and season with the salt and black pepper.",
      "Lay the chicken pieces over the rice, skin-side up, with their juices.",
      "Bake at 190°C for 35 minutes, until the rice has drunk the water and the chicken is cooked through and crisp at the edges.",
      "Rest 10 minutes under foil and serve from the dish, rice first, chicken over it.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-pile-frikase",
    name: { en: "Bulgarian Chicken Fricassee with Yogurt (Pile Frikase)", hindi: "बुल्गारियाई चिकन फ्रिकासे (पिले फ्रिकासे)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 650 }, // chicken breast
      { foodId: "usda-2259793", grams: 300 }, // yogurt
      { foodId: "usda-172184", grams: 40 }, // egg yolks
      { foodId: "usda-168936", grams: 30 }, // flour
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 8 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Simmer the chicken breast gently in about 700 ml of salted water for 18 minutes, until just cooked; keep the broth and cut the meat into large pieces.",
      "Melt the butter, stir in the flour, and cook 1 minute to a pale roux.",
      "Whisk in about 500 ml of the hot broth a little at a time and simmer 3 minutes to a smooth sauce.",
      "Whisk the egg yolks with the yogurt and a squeeze of lemon; temper with a ladle of sauce, then stir into the pan off the boil.",
      "Return the chicken to the sauce and warm through gently for 3 minutes, never boiling, which would split the yogurt.",
      "Serve with the black pepper ground over and the coriander leaves scattered, with rice or mashed potato beside it.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-bob-yahniya",
    name: { en: "Bulgarian White Bean Stew (Bob Yahniya)", hindi: "बुल्गारियाई सफ़ेद बीन्स स्टू (बॉब याहनिया)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 340 }, // navy beans, dry
      { foodId: "usda-170457", grams: 350 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-171025", grams: 45 }, // sunflower oil
      { foodId: "usda-173475", grams: 8 }, // mint leaves
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170932", grams: 1 }, // cayenne
    ],
    method: [
      "Soak the navy beans overnight; drain, cover with fresh water, boil 10 minutes, and throw away that first water.",
      "Cover again and simmer the beans for 45 minutes, until nearly tender.",
      "Meanwhile soften the onion in the sunflower oil for 6 minutes until golden at the edges, and stir in the chopped tomatoes, salt and cayenne.",
      "Cook the tomato sauce down for 10 minutes, until thick and sweet.",
      "Combine the beans with the sauce and a little of their cooking water and simmer together 20 minutes, until the stew is rich and the beans completely soft.",
      "Tear in the mint, rest 10 minutes, and serve with bread; a yahniya should be saucy, never dry.",
    ],
    timeMinutes: 95,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-smilyanski-fasul",
    name: { en: "Bulgarian Baked Beans, Smilyan-Style (Smilyanski Fasul)", hindi: "बुल्गारियाई बेक्ड बीन्स (स्मिल्यांस्की फ़ासुल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 360 }, // navy beans, standing in for the great Smilyan beans
      { foodId: "usda-790646", grams: 180 }, // onion
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-171025", grams: 45 }, // sunflower oil
      { foodId: "usda-173475", grams: 8 }, // mint leaves
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Smilyan, in the Rhodopes, grows Bulgaria's most prized beans; the verified set's navy beans stand in for them here, and the method is the village's own.",
      "Soak the beans overnight, drain, boil 10 minutes in fresh water and discard it, then simmer 40 minutes until tender but whole.",
      "Soften the onion in the sunflower oil for 6 minutes; stir in the tomatoes, cayenne and salt and cook 5 minutes.",
      "Combine beans and sauce in a clay baking dish with a little bean water, the top beans just peeking out.",
      "Bake at 180°C for 35 minutes, until the top is burnished and the sauce has tightened around the beans.",
      "Tear in the mint and serve in the clay dish; baked fasul is drier and deeper than a chorba, and proud of it.",
    ],
    timeMinutes: 100,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-piperki-byurek",
    name: { en: "Bulgarian Peppers Stuffed with White Cheese (Piperki Byurek)", hindi: "बुल्गारियाई भरी मिर्च पनीर (पिपेर्की ब्युरेक)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-170427", grams: 700 }, // green peppers
      { foodId: "usda-328841", grams: 350 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-168936", grams: 40 }, // flour, for the light coating
      { foodId: "usda-171025", grams: 60 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Roast the peppers under a hot grill until their skins blister, about 10 minutes; rest them covered and peel the skins away, keeping the peppers whole.",
      "Make a slit down one side of each pepper and ease out the seeds.",
      "Crumble the cottage cheese and mix it with the beaten eggs and salt to a thick filling.",
      "Fill each pepper generously through the slit and press it gently closed.",
      "Dust the peppers lightly in the flour and fry them in the hot sunflower oil, about 3 minutes a side, until golden and crisp at the edges.",
      "Drain on paper and serve hot, with a tomato salad; the cheese should be molten inside its pepper.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-sach",
    name: { en: "Bulgarian Sizzling Chicken and Vegetables (Sach)", hindi: "बुल्गारियाई चिकन सब्ज़ी साच" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170108", grams: 250 }, // red peppers
      { foodId: "usda-170427", grams: 150 }, // green pepper
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-328637", grams: 80 }, // cheddar, standing in for kashkaval
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Heat a sach, the flat clay plate this dish is named for, or a heavy cast-iron pan, until it is properly hot.",
      "Sear the chicken thigh pieces in the sunflower oil for 6 minutes until golden; set aside.",
      "In the same pan, cook the onion and both peppers for 5 minutes, then the mushrooms for 4 minutes.",
      "Add the tomatoes, salt and black pepper and cook 5 minutes to a thick sauce around the vegetables.",
      "Return the chicken, toss everything together, and heat through for 3 minutes.",
      "Scatter the cheddar over the top, let it melt into the sizzle for 1 minute, and carry the pan to the table still bubbling.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-drob-sarma-style",
    name: { en: "Bulgarian Lamb and Rice Bake, Drob Sarma-Style", hindi: "बुल्गारियाई मेमना चावल बेक (द्रोब सार्मा-स्टाइल)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-174370", grams: 550 }, // ground lamb, standing in for the classic lamb offal
      { foodId: "usda-2512381", grams: 200 }, // white rice
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173475", grams: 10 }, // mint leaves
      { foodId: "usda-2259793", grams: 150 }, // yogurt, for the topping
      { foodId: "usda-171287", grams: 50 }, // egg, for the topping
      { foodId: "usda-171025", grams: 35 }, // sunflower oil
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Drob sarma is the Easter bake of lamb offal and rice; no offal exists in the verified set, so minced lamb stands in, and the dish is named -Style to say so.",
      "Soften the onion in the sunflower oil, add the lamb mince, and fry 7 minutes, breaking it fine.",
      "Add the rice, mint, salt and black pepper with about 400 ml of water; simmer 10 minutes, until the rice is half cooked.",
      "Tip the mixture into a baking dish and level it.",
      "Whisk the yogurt with the egg and spread the zastroyka over the top.",
      "Bake at 190°C for 25 minutes, until the topping is set and golden; rest 10 minutes and serve in squares.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-kachamak",
    name: { en: "Bulgarian Cornmeal with White Cheese (Kachamak)", hindi: "बुल्गारियाई मक्का काचामाक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 280 }, // cornmeal
      { foodId: "usda-328841", grams: 250 }, // cottage cheese, standing in for sirene
      { foodId: "usda-173410", grams: 50 }, // butter
      { foodId: "usda-170932", grams: 2 }, // cayenne, for the hot butter
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Bring about 1.1 litres of water to the boil with the salt.",
      "Rain in the cornmeal in a thin stream, whisking without pause so no lumps form; this is the whole skill of kachamak.",
      "Lower the heat and stir the kachamak steadily for 15 minutes, until it thickens, pulls from the sides, and a spoon stands in it.",
      "Spread half in a warm dish, crumble over half the cottage cheese, then the rest of the kachamak and the remaining cheese.",
      "Melt the butter until foaming, stir in the cayenne, and pour the red butter over the top the moment it colours.",
      "Serve at once in deep plates; Rhodope kachamak waits for nobody.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  /* ----------------------------------- fish ----------------------------------- */
  {
    id: "dish-bg-plnena-skumriya",
    name: { en: "Bulgarian Walnut-Stuffed Mackerel (Plnena Skumriya)", hindi: "बुल्गारियाई अखरोट भरी मैकरल (प्लनेना स्कुम्रिया)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 700 }, // mackerel
      { foodId: "usda-2346394", grams: 80 }, // walnuts
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170457", grams: 150 }, // tomatoes
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-169997", grams: 12 }, // coriander leaves, standing in for parsley
      { foodId: "usda-171025", grams: 25 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soften the onion in half the sunflower oil for 5 minutes; add the chopped tomatoes and cook 4 minutes to a thick filling base.",
      "Chop the walnuts coarsely and stir them in with half the coriander leaves and the salt; cool the stuffing.",
      "Split each mackerel along the belly, clean it, and season inside and out.",
      "Fill the cavities with the walnut stuffing and press the fish closed; a cocktail stick holds each one if needed.",
      "Lay the fish in an oiled baking dish, drizzle the remaining oil, and bake at 190°C for 20 minutes, until the skin crisps and the flesh flakes.",
      "Serve with lemon wedges and the remaining coriander, the Black Sea way.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-skumriya-na-skara",
    name: { en: "Bulgarian Grilled Mackerel with Lemon (Skumriya na Skara)", hindi: "बुल्गारियाई ग्रिल्ड मैकरल (स्कुम्रिया ना स्कारा)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 800 }, // mackerel
      { foodId: "usda-167746", grams: 50 }, // lemon
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 10 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Clean the mackerel, score each side twice with a sharp knife, and season with the salt inside and out.",
      "Rest the fish 15 minutes so the salt firms the flesh for the grill.",
      "Brush the fish and the grill lightly with the sunflower oil; mackerel's own oils do the rest.",
      "Grill over high heat for about 5 minutes a side, turning once, until the skin is crisp and blistered and the flesh just flakes.",
      "Rest 2 minutes; grilled fish dries if it waits.",
      "Serve with lemon wedges and the coriander leaves, with a shopska salad beside it, the whole Bulgarian seaside on one plate.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-riba-plakiya",
    name: { en: "Bulgarian Baked Fish with Tomato and Onion (Riba Plakiya)", hindi: "बुल्गारियाई बेक्ड मछली (रिबा प्लाकिया)" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 650 }, // cod
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 250 }, // onion
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-171025", grams: 40 }, // sunflower oil
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-169997", grams: 12 }, // coriander leaves, standing in for parsley
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Soften the onion in the sunflower oil for 6 minutes until sweet and translucent.",
      "Add the garlic and the chopped tomatoes, salt and black pepper, and cook 8 minutes to a thick plakiya sauce.",
      "Cut the cod into portions and season them.",
      "Spread half the sauce in a baking dish, lay the fish over it, and blanket with the remaining sauce and thin lemon slices.",
      "Bake at 190°C for 20 minutes, until the fish flakes at the touch of a fork and the sauce bubbles at the edges.",
      "Scatter the coriander leaves and serve from the dish with bread for the sauce.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  /* -------------------------------- breakfasts -------------------------------- */
  {
    id: "dish-bg-mish-mash",
    name: { en: "Bulgarian Eggs with Peppers, Tomato and White Cheese (Mish-Mash)", hindi: "बुल्गारियाई अंडा मिर्च टमाटर (मिश-माश)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-170108", grams: 200 }, // red peppers
      { foodId: "usda-170427", grams: 100 }, // green pepper
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-328841", grams: 120 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171025", grams: 30 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-169997", grams: 8 }, // coriander leaves, standing in for parsley
    ],
    method: [
      "Soften the onion and both peppers in the sunflower oil for 6 minutes, until the peppers slump.",
      "Add the chopped tomatoes and salt and cook 6 minutes, until the sauce thickens and the oil shows at the edges.",
      "Crumble in the cottage cheese and stir until it just melts into the sauce.",
      "Beat the eggs lightly and pour them over; stir slowly with a spatula, folding the curds as they set, about 3 minutes.",
      "Take the pan off the heat while the eggs are still soft and glossy; they finish in the pan's warmth.",
      "Scatter the coriander leaves and serve at once with thick bread, straight from the pan.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-yaytsa-panagyurski",
    name: { en: "Bulgarian Poached Eggs on Yogurt, Panagyurishte-Style (Yaytsa po Panagyurski)", hindi: "बुल्गारियाई पोच्ड अंडे दही पर (यायत्सा पो पानाग्युरिस्की)" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // eggs
      { foodId: "usda-2259793", grams: 250 }, // yogurt
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-170932", grams: 2 }, // cayenne, for the red butter
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-173469", grams: 10 }, // apple cider vinegar, for the poaching water
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Stir the crushed garlic and half the salt into the yogurt and spread it in soft mounds on warm plates; the yogurt is the eggs' bed and must be at room temperature, never fridge-cold.",
      "Bring a wide pan of water to the barest simmer and add the vinegar and remaining salt.",
      "Crack each egg into a cup, swirl the water, and slip the eggs in; poach 3 minutes, until the whites set around runny yolks.",
      "Lift the eggs out with a slotted spoon, drain a moment, and lay them over the yogurt.",
      "Melt the butter until it foams, stir in the cayenne, and take it off the heat as it turns brick red.",
      "Spoon the hot red butter over the eggs so it pools in the yogurt, and serve at once with bread.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-bg-buhti",
    name: { en: "Bulgarian Yogurt Dough Fritters (Buhti)", hindi: "बुल्गारियाई दही आटा पकोड़े (बुहती)" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour
      { foodId: "usda-2259793", grams: 250 }, // yogurt
      { foodId: "usda-171287", grams: 50 }, // egg
      { foodId: "usda-334247", grams: 20 }, // sugar
      { foodId: "usda-171025", grams: 80 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the yogurt with the egg, sugar and salt until smooth.",
      "Stir in the flour to a soft, sticky dough, softer than bread dough; rest it 15 minutes so the flour drinks in.",
      "Heat the sunflower oil in a deep pan to a steady frying heat, a cube of dough should rise sizzling at once.",
      "With two oiled spoons, drop small mounds of dough into the oil; they puff and turn themselves as they colour.",
      "Fry about 3 minutes, turning, until deep golden all over; drain on paper.",
      "Serve hot, dusted with a little extra sugar or with white cheese on the side, the Bulgarian breakfast table holds both.",
    ],
    timeMinutes: 30,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-bg-palachinki",
    name: { en: "Bulgarian Crepes with Honey and Walnuts (Palachinki)", hindi: "बुल्गारियाई क्रेप शहद अखरोट (पालाचिंकी)" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 250 }, // refined wheat flour
      { foodId: "usda-322892", grams: 500 }, // whole milk
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-169640", grams: 60 }, // honey
      { foodId: "usda-2346394", grams: 50 }, // walnuts
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the flour, eggs and salt with a little of the milk to a smooth paste, then whisk in the rest; rest the batter 20 minutes.",
      "Chop the walnuts finely and warm the honey until it pours.",
      "Heat a crepe pan, brush it with butter, and pour in a thin ladle of batter, swirling to coat the pan.",
      "Cook about 1 minute, until the edges lift and the underside is freckled gold; flip and give it 20 seconds more.",
      "Stack the palachinki as they come off the pan, brushing each with a whisper of butter.",
      "Roll or fold them around the walnuts, spoon the warm honey over, and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------- banitsa & pastry ------------------------------- */
  {
    id: "dish-bg-banitsa-sirene",
    name: { en: "Bulgarian White Cheese Banitsa", hindi: "बुल्गारियाई सफ़ेद चीज़ बानित्सा" },
    category: "breakfast",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 450 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-328841", grams: 400 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171287", grams: 150 }, // eggs
      { foodId: "usda-2259793", grams: 150 }, // yogurt
      { foodId: "usda-173410", grams: 60 }, // butter
      { foodId: "usda-171025", grams: 20 }, // sunflower oil, for the dough and pan
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with about 250 ml of warm water, the salt and a spoon of the sunflower oil to a smooth dough; rest it 30 minutes under a cloth.",
      "Divide the dough into balls and roll each one out, then stretch it by hand over the back of your hands until it is nearly transparent, the banitsa sheet is rolled, never bought, in this kitchen.",
      "Crumble the cottage cheese and mix it with the beaten eggs and yogurt.",
      "Lay a sheet in an oiled round pan, brush with melted butter, scatter the cheese mixture, and repeat, sheet, butter, cheese, building the spiral of layers.",
      "Finish with a sheet, brush the top generously with butter, and tuck the edges in.",
      "Bake at 190°C for 35 minutes, until deep golden and crisp; rest 10 minutes and cut in wedges, traditionally eaten with ayran.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg-spanachnik",
    name: { en: "Bulgarian Spinach Banitsa (Spanachnik)", hindi: "बुल्गारियाई पालक बानित्सा (स्पानाचनिक)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 450 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-168462", grams: 500 }, // spinach
      { foodId: "usda-328841", grams: 250 }, // cottage cheese, standing in for sirene
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Knead the flour with about 250 ml of warm water, half the salt and a spoon of the sunflower oil to a smooth dough; rest 30 minutes.",
      "Wilt the spinach in a dry pan for 3 minutes, squeeze it completely dry, and chop it; wet spinach makes a soggy banitsa.",
      "Mix the spinach with the crumbled cottage cheese, beaten eggs and remaining salt.",
      "Roll and stretch the dough into near-transparent sheets, as for a white cheese banitsa.",
      "Layer the sheets in an oiled pan, brushing each with sunflower oil and scattering the spinach mixture between them.",
      "Bake at 190°C for 35 minutes, until crisp and golden; rest 10 minutes and cut in squares.",
    ],
    timeMinutes: 70,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-banitsa-praz-style",
    name: { en: "Bulgarian Leek Banitsa-Style (with Onion)", hindi: "बुल्गारियाई लीक बानित्सा-स्टाइल (प्याज़ के साथ)" },
    category: "bread",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 450 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-790646", grams: 600 }, // onion, standing in for leeks
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-171025", grams: 60 }, // sunflower oil
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "The classic praz banitsa is filled with leeks; leeks are not in the verified set, so sweet onion, cooked the same slow way, stands in, and the name says -Style for it.",
      "Knead the flour with about 250 ml of warm water, half the salt and a spoon of the sunflower oil to a smooth dough; rest 30 minutes.",
      "Slice the onion finely and cook it slowly in half the sunflower oil for 15 minutes, until soft, sweet and golden; season with the remaining salt and the black pepper and cool.",
      "Stir the beaten eggs into the cooled onion.",
      "Roll and stretch the dough into near-transparent sheets and layer them in an oiled pan, brushing with oil and spreading the onion mixture between the sheets.",
      "Bake at 190°C for 35 minutes, until crisp and deep golden; rest 10 minutes and cut in squares, the winter banitsa of the Rhodope villages.",
    ],
    timeMinutes: 75,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven"],
  },
  /* --------------------------------- desserts --------------------------------- */
  {
    id: "dish-bg-tikvenik-style",
    name: { en: "Bulgarian Sweet Potato and Walnut Pie, Tikvenik-Style", hindi: "बुल्गारियाई शकरकंद अखरोट पाई (तिकवेनिक-स्टाइल)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 350 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-2346404", grams: 700 }, // sweet potato, standing in for pumpkin
      { foodId: "usda-2346394", grams: 100 }, // walnuts
      { foodId: "usda-334247", grams: 120 }, // sugar
      { foodId: "usda-171320", grams: 4 }, // cinnamon
      { foodId: "usda-171025", grams: 50 }, // sunflower oil
    ],
    method: [
      "Tikvenik is Bulgaria's pumpkin banitsa; pumpkin is not in the verified set, so sweet potato, grated and spiced the same way, stands in, and the pie is named -Style to say so.",
      "Knead the flour with about 200 ml of warm water and a spoon of the sunflower oil to a smooth dough; rest 30 minutes.",
      "Grate the sweet potato coarsely and mix it with the sugar, cinnamon and chopped walnuts.",
      "Roll and stretch the dough into near-transparent sheets, as for banitsa.",
      "Lay a sheet in an oiled pan, brush with oil, and scatter the sweet potato mixture; roll each filled sheet into a rope and coil the ropes into a spiral.",
      "Bake at 180°C for 40 minutes, until crisp and amber; cool before cutting, and dust with a little extra sugar if your house does.",
    ],
    timeMinutes: 80,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-bg-baklava-style",
    name: { en: "Bulgarian Walnut Baklava-Style", hindi: "बुल्गारियाई अखरोट बाकलावा-स्टाइल" },
    category: "dessert",
    servings: 8,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 400 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-2346394", grams: 300 }, // walnuts
      { foodId: "usda-334247", grams: 250 }, // sugar, for the syrup
      { foodId: "usda-169640", grams: 80 }, // honey, for the syrup
      { foodId: "usda-173410", grams: 120 }, // butter
      { foodId: "usda-171320", grams: 4 }, // cinnamon
      { foodId: "usda-167746", grams: 20 }, // lemon, for the syrup
    ],
    method: [
      "Baklava here is built on hand-rolled sheets, as the banitsa is; there is no filo in the verified set, so the sheets are rolled from flour dough and the name carries -Style.",
      "Knead the flour with about 220 ml of warm water to a smooth dough; rest 30 minutes, then roll and stretch it into the thinnest sheets you can.",
      "Chop the walnuts with the cinnamon, not to dust, but to a coarse crumb.",
      "Layer the sheets in a buttered pan, brushing each with melted butter, and scatter the walnut mixture over every second sheet.",
      "Cut the baklava into diamonds before baking, and bake at 170°C for 40 minutes, until deep golden and crisp.",
      "Simmer the sugar and honey with about 250 ml of water and the lemon for 8 minutes; pour the hot syrup over the hot baklava and rest at least 4 hours, better overnight, before serving.",
    ],
    timeMinutes: 90,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-bg-mlechna-banitsa",
    name: { en: "Bulgarian Milk Banitsa (Mlechna Banitsa)", hindi: "बुल्गारियाई दूध बानित्सा (म्लेचना बानित्सा)" },
    category: "dessert",
    servings: 6,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 350 }, // refined wheat flour, for the hand-rolled sheets
      { foodId: "usda-322892", grams: 600 }, // whole milk
      { foodId: "usda-171287", grams: 150 }, // eggs
      { foodId: "usda-334247", grams: 120 }, // sugar
      { foodId: "usda-173410", grams: 50 }, // butter
    ],
    method: [
      "Knead the flour with about 200 ml of warm water to a smooth dough; rest 30 minutes.",
      "Roll and stretch the dough into near-transparent sheets, as for banitsa, and lay them loosely and wrinkled in a buttered baking dish, the folds are the texture of this banitsa.",
      "Brush the sheets with the melted butter between the folds.",
      "Whisk the eggs with the sugar and stir in the milk; this sweet custard is the mlechna, the milk filling.",
      "Pour the custard evenly over the sheets so it settles into every fold.",
      "Bake at 180°C for 35 minutes, until puffed, golden and just set; serve warm or cold, cut in generous squares.",
    ],
    timeMinutes: 65,
    budgetTier: 2,
    enriched: false,
    equipment: ["oven"],
  },
  /* ---------------------------------- drinks ---------------------------------- */
  {
    id: "dish-bg-ayran",
    name: { en: "Bulgarian Ayran (Salted Yogurt Drink)", hindi: "बुल्गारियाई आयरान (नमकीन दही पेय)" },
    category: "drink",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2259793", grams: 400 }, // yogurt
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Chill the yogurt well first; ayran is a cold drink and lukewarm yogurt never froths.",
      "Whisk the yogurt with the salt until completely smooth and glossy, with no lumps left.",
      "Whisk in about 400 ml of ice-cold water, a little at a time, checking the consistency as you go.",
      "Stop when the ayran pours like thin cream; thinner is a watery failure, thicker is a spoon drink.",
      "Whisk once more, hard, just before serving to raise a light froth on top.",
      "Serve ice-cold in tall glasses, the standing partner to banitsa and to the whole summer table.",
    ],
    timeMinutes: 5,
    budgetTier: 1,
    enriched: false,
    equipment: ["fridge"],
    noCook: true,
  },
  {
    id: "dish-bg-kompot",
    name: { en: "Bulgarian Stewed Fruit Kompot", hindi: "बुल्गारियाई फलों का कोम्पोट" },
    category: "drink",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-171688", grams: 400 }, // apples
      { foodId: "usda-174683", grams: 300 }, // grapes
      { foodId: "usda-334247", grams: 60 }, // sugar
    ],
    method: [
      "Core the apples and cut them into wedges; pull the grapes from their stems.",
      "Bring about 1.5 litres of water to the boil with the sugar and stir until it dissolves.",
      "Add the apples and simmer 8 minutes, until just tender.",
      "Add the grapes and simmer 2 minutes more, only until their skins begin to split.",
      "Take off the heat and cool completely; kompot is served cold, the fruit swimming in its own juice.",
      "Serve in glasses with some fruit in each, the taste of every Bulgarian grandmother's larder.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ---------------------------------- snacks ---------------------------------- */
  {
    id: "dish-bg-tsatsa-style",
    name: { en: "Bulgarian Fried Fish, Tsatsa-Style", hindi: "बुल्गारियाई तली मछली (त्सात्सा-स्टाइल)" },
    category: "snack",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia, standing in for the small river fish
      { foodId: "usda-168936", grams: 80 }, // flour, for the coating
      { foodId: "usda-171025", grams: 70 }, // sunflower oil, for frying
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Tsatsa is Bulgaria's beloved fried sprat, eaten whole by the plateful; sprats are not in the verified set, so small tilapia strips, fried the same way, stand in, and the name says -Style.",
      "Cut the tilapia into finger-length strips and season with the salt.",
      "Toss the strips in the flour until every piece is evenly dusted; shake off the excess.",
      "Heat the sunflower oil until hot and fry the strips in batches for about 3 minutes, until crisp and golden.",
      "Drain on paper and keep the batches warm; tsatsa must be crisp, never steamed under a lid.",
      "Serve in a heap with lemon wedges, eaten with the fingers, the beer-garden ritual of the Bulgarian summer.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
];
