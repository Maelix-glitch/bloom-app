/**
 * Protein wave PW-1 — protein shakes & smoothies. The first wave of
 * the owner's protein mandate (at least 300 protein-related additions
 * across the waves): the dish pool grows where dish-first plans draw
 * hardest — quick, high-protein drinks a plan can anchor a meal or a
 * training day on.
 *
 * Every shake clears the standing protein bar — at least 25 g of
 * protein in a serving, COMPUTED by `dishNutrients` from the lines
 * below and pinned by dishLibraryShakes.test.ts — and every one is
 * built from whole ingredients: Greek yogurt, cottage cheese, milk,
 * eggs (boiled, then blended), tofu, tempeh, edamame, nut butters
 * blended from the nuts themselves, seeds, oats, sattu, and the two
 * generic USDA protein powders (whey isolate usda-173177 and
 * soy-based usda-173181, added to the reference set by this wave —
 * SR Legacy's unbranded records; the branded ones were not picked).
 *
 * The health rules that removed 99 dishes in the overnight pass hold
 * here: NO shake carries added sugar or honey at all — ripe fruit
 * does the sweetening — and nothing here is a dessert milkshake in
 * disguise. Recipes compose only from the USDA reference set, and a
 * method never names an ingredient that is not a line; water and ice
 * are not lines (they carry no nutrients and are not reference
 * foods). Egg shakes boil the egg first — no raw egg is blended
 * anywhere in this wave.
 */

import type { Dish } from "../dishes";

export const SHAKES_DISHES: readonly Dish[] = [
  {
    id: "dish-shake-greek-yogurt-banana",
    name: { en: "Banana Greek Yogurt Shake", hindi: "बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-173944", grams: 100 }, // banana
      { foodId: "usda-322559", grams: 100 }, // skim milk
    ],
    method: [
      "Peel the banana and break it into chunks; the riper it is, the sweeter the shake — no sugar is needed.",
      "Spoon the Greek yogurt into the blender and pour the skim milk over it; liquid first keeps the blades moving.",
      "Add the banana and blend on high for 45–60 seconds, until completely smooth with no banana flecks.",
      "Check the texture: it should pour in a thick ribbon. Too thick, blend in a splash of water; too thin, a spoonful more yogurt.",
      "Pour into a tall glass and drink at once, while it is cold and frothy.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-mango",
    name: { en: "Mango Greek Yogurt Shake", hindi: "मैंगो ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-169910", grams: 120 }, // mango
      { foodId: "usda-322892", grams: 80 }, // whole milk
    ],
    method: [
      "Peel the mango and cut the flesh away from the stone in chunks; a ripe, fragrant mango does all the sweetening.",
      "Put the Greek yogurt and whole milk in the blender first, then the mango chunks.",
      "Blend on high for a full minute — mango fibres need the extra time to disappear into the shake.",
      "Stop and scrape down the sides once, then blend 15 seconds more; the shake should be glossy and uniform.",
      "Rest for 2 minutes so the foam settles, then pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-strawberry",
    name: { en: "Strawberry Greek Yogurt Shake", hindi: "स्ट्रॉबेरी ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 240 }, // greek yogurt
      { foodId: "usda-327699", grams: 120 }, // strawberries
      { foodId: "usda-322559", grams: 80 }, // skim milk
    ],
    method: [
      "Hull the strawberries and halve any large ones; keep a small one back for the top if you like.",
      "Add the Greek yogurt and skim milk to the blender, then the strawberries.",
      "Blend on high for 45–60 seconds until the shake is evenly pink and the strawberry seeds are the only texture left.",
      "Taste: a tart batch of berries may need 2–3 minutes of standing — the yogurt's edge softens as it sits.",
      "Pour into a glass, top with the reserved strawberry, and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-strawberry-banana",
    name: { en: "Strawberry Banana Greek Yogurt Shake", hindi: "स्ट्रॉबेरी बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-327699", grams: 90 }, // strawberries
      { foodId: "usda-173944", grams: 70 }, // banana
      { foodId: "usda-322559", grams: 60 }, // skim milk
    ],
    method: [
      "Hull the strawberries and peel the banana; break the banana into the blender in chunks.",
      "Add the Greek yogurt and skim milk, then the strawberries.",
      "Blend on high for about a minute, until the banana has fully disappeared and the colour is even.",
      "The banana makes this one thicker — blend in a splash of water if you want it pourable rather than spoonable.",
      "Serve at once in a cold glass.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-orange-cardamom",
    name: { en: "Orange Cardamom Greek Yogurt Shake", hindi: "ऑरेंज कार्डमम ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-746771", grams: 130 }, // orange
      { foodId: "usda-322892", grams: 80 }, // whole milk
      { foodId: "usda-170919", grams: 1 }, // cardamom
    ],
    method: [
      "Peel the orange and pull it into segments, picking out any pips and thick pith — pith turns a shake bitter.",
      "Crush the cardamom and pick out the black seeds; discard the husks.",
      "Put the Greek yogurt, whole milk and cardamom seeds in the blender, then the orange segments.",
      "Blend on high for 45 seconds, until the orange has broken down completely and the shake smells of cardamom.",
      "Pour and serve immediately — orange shakes separate if they stand.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-apple-cinnamon",
    name: { en: "Apple Cinnamon Greek Yogurt Shake", hindi: "एप्पल सिनेमन ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-171688", grams: 120 }, // apple
      { foodId: "usda-2346396", grams: 20 }, // oats
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Stir the oats into the Greek yogurt and leave for 10 minutes — softened oats blend silk-smooth instead of gritty.",
      "Core the apple and cut it into chunks, skin on; the skin carries the fibre.",
      "Add the yogurt-oat mixture, apple chunks, cinnamon and a splash of water to the blender.",
      "Blend on high for a full minute, until no apple skin flecks remain visible.",
      "Pour into a glass; the shake thickens slightly as it stands for a minute. Serve cold.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-pear-ginger",
    name: { en: "Pear Ginger Greek Yogurt Shake", hindi: "पेयर जिंजर ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 240 }, // greek yogurt
      { foodId: "usda-746773", grams: 120 }, // pear
      { foodId: "usda-169231", grams: 5 }, // ginger
      { foodId: "usda-322559", grams: 60 }, // skim milk
    ],
    method: [
      "Quarter the pear and cut out the core; leave the skin on. Peel the ginger and slice it thin so it blends out.",
      "Add the Greek yogurt and skim milk to the blender, then the pear and ginger.",
      "Blend on high for about a minute, until the ginger has vanished into the shake — no fibrous bits should remain.",
      "Check the warmth: ginger should hum in the background, not bite. Blend in an extra spoonful of yogurt to tame it.",
      "Serve cold, straight away.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-watermelon-mint",
    name: { en: "Watermelon Mint Greek Yogurt Shake", hindi: "वॉटरमेलन मिंट ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 240 }, // greek yogurt
      { foodId: "usda-167765", grams: 150 }, // watermelon
      { foodId: "usda-173475", grams: 3 }, // spearmint
      { foodId: "usda-322559", grams: 50 }, // skim milk
    ],
    method: [
      "Cut the watermelon flesh into cubes, picking out the seeds; chill the cubes well — this shake wants to be icy.",
      "Put the Greek yogurt and skim milk in the blender, then the watermelon and the spearmint leaves.",
      "Blend on high for 30–40 seconds only — watermelon breaks down fast and over-blending makes it watery.",
      "Pour at once over a glass; the shake is light and frothy and separates on standing, so drink it now.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder", "fridge"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-jackfruit",
    name: { en: "Jackfruit Greek Yogurt Shake", hindi: "जैकफ्रूट ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 240 }, // greek yogurt
      { foodId: "usda-174687", grams: 110 }, // jackfruit
      { foodId: "usda-322559", grams: 60 }, // skim milk
    ],
    method: [
      "Pull the jackfruit bulbs apart and remove every seed; ripe bulbs should smell sweet and give slightly when pressed.",
      "Add the Greek yogurt and skim milk to the blender, then the jackfruit.",
      "Blend on high for a full minute — jackfruit is fibrous and needs the time to turn smooth.",
      "Scrape down the sides and blend 15 seconds more; the shake should be pale gold and thick.",
      "Serve cold at once.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-cottage-cheese-banana",
    name: { en: "Banana Cottage Cheese Shake", hindi: "बनाना कॉटेज चीज़ शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 200 }, // cottage cheese
      { foodId: "usda-173944", grams: 100 }, // banana
      { foodId: "usda-322892", grams: 120 }, // whole milk
    ],
    method: [
      "Peel the banana and break it into chunks.",
      "Put the cottage cheese and whole milk in the blender first and blend for 30 seconds on their own — this first pass is what makes cottage cheese silky instead of grainy.",
      "Add the banana and blend on high for another 45 seconds, until no curd grains remain when you rub a drop between your fingers.",
      "Pour into a tall glass and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-cottage-cheese-mango",
    name: { en: "Mango Cottage Cheese Shake", hindi: "मैंगो कॉटेज चीज़ शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 200 }, // cottage cheese
      { foodId: "usda-169910", grams: 110 }, // mango
      { foodId: "usda-322559", grams: 100 }, // skim milk
    ],
    method: [
      "Peel the mango and cut the flesh from the stone in chunks.",
      "Blend the cottage cheese with the skim milk for 30 seconds first, until smooth.",
      "Add the mango and blend on high for a full minute — mango fibre and cheese curd both need the time.",
      "Rest 2 minutes for the foam to settle, then pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-cottage-cheese-strawberry",
    name: { en: "Strawberry Cottage Cheese Shake", hindi: "स्ट्रॉबेरी कॉटेज चीज़ शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 210 }, // cottage cheese
      { foodId: "usda-327699", grams: 110 }, // strawberries
      { foodId: "usda-322559", grams: 80 }, // skim milk
    ],
    method: [
      "Hull the strawberries and halve the large ones.",
      "Blend the cottage cheese and skim milk alone for 30 seconds, until the curds have completely smoothed out.",
      "Add the strawberries and blend on high for 45 seconds, until evenly pink.",
      "Pour and serve cold, before it stands and thickens.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-cottage-cheese-orange",
    name: { en: "Orange Cottage Cheese Shake", hindi: "ऑरेंज कॉटेज चीज़ शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 210 }, // cottage cheese
      { foodId: "usda-746771", grams: 120 }, // orange
      { foodId: "usda-322559", grams: 80 }, // skim milk
    ],
    method: [
      "Peel the orange into segments, removing pips and thick pith to keep the shake sweet, not bitter.",
      "Blend the cottage cheese with the skim milk for 30 seconds first, until silky.",
      "Add the orange segments and blend on high for 45 seconds, until the orange has fully broken down.",
      "Serve immediately — citrus shakes separate on standing.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-cottage-cheese-oats-banana",
    name: { en: "Banana Oat Cottage Cheese Shake", hindi: "बनाना ओट कॉटेज चीज़ शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 180 }, // cottage cheese
      { foodId: "usda-2346396", grams: 30 }, // oats
      { foodId: "usda-173944", grams: 80 }, // banana
      { foodId: "usda-322892", grams: 100 }, // whole milk
    ],
    method: [
      "Stir the oats into the whole milk and leave for 10 minutes to soften — or overnight in the fridge for the smoothest result.",
      "Peel the banana and break it into chunks.",
      "Blend the cottage cheese on its own for 20 seconds, then add the oat-milk mixture and the banana.",
      "Blend on high for a full minute, until thick and completely smooth.",
      "Pour and serve; this is a filling, breakfast-weight shake.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-shake-double-dairy-banana",
    name: { en: "Banana Double-Dairy Shake", hindi: "बनाना डबल-डेयरी शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 150 }, // greek yogurt
      { foodId: "usda-328841", grams: 120 }, // cottage cheese
      { foodId: "usda-173944", grams: 80 }, // banana
      { foodId: "usda-322559", grams: 60 }, // skim milk
    ],
    method: [
      "Peel the banana and break it into chunks.",
      "Blend the cottage cheese with the skim milk for 30 seconds first, until no curd grains remain.",
      "Add the Greek yogurt and banana and blend on high for 45 seconds, until thick and uniform.",
      "Pour into a glass and serve cold — the plainest, most protein-dense shake in this set.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-cottage-cheese-oat",
    name: { en: "Greek Yogurt & Cottage Cheese Oat Shake", hindi: "ग्रीक योगर्ट एंड कॉटेज चीज़ ओट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 130 }, // greek yogurt
      { foodId: "usda-328841", grams: 110 }, // cottage cheese
      { foodId: "usda-2346396", grams: 20 }, // oats
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Stir the oats into the Greek yogurt and rest for 10 minutes so they soften.",
      "Blend the cottage cheese with a splash of water for 20 seconds, until smooth.",
      "Add the yogurt-oat mixture and the peeled, chunked banana; blend on high for a full minute.",
      "The shake should be thick enough to coat the glass. Serve cold at once.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-greek-yogurt-cottage-cheese-strawberry",
    name: { en: "Strawberry Greek Yogurt & Cottage Cheese Shake", hindi: "स्ट्रॉबेरी ग्रीक योगर्ट एंड कॉटेज चीज़ शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 140 }, // greek yogurt
      { foodId: "usda-328841", grams: 110 }, // cottage cheese
      { foodId: "usda-327699", grams: 100 }, // strawberries
      { foodId: "usda-322559", grams: 60 }, // skim milk
    ],
    method: [
      "Hull the strawberries and halve them.",
      "Blend the cottage cheese and skim milk for 30 seconds first, until silky.",
      "Add the Greek yogurt and strawberries; blend on high for 45 seconds, until evenly pink and smooth.",
      "Pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-milk-greek-yogurt-banana",
    name: { en: "Banana Milk & Greek Yogurt Shake", hindi: "बनाना मिल्क एंड ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 180 }, // greek yogurt
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-173944", grams: 90 }, // banana
    ],
    method: [
      "Peel the banana and break it into chunks.",
      "Pour the whole milk into the blender, add the Greek yogurt, then the banana.",
      "Blend on high for 45–60 seconds, until frothy and completely smooth.",
      "This is the most drinkable shake in the wave — pour it into a bottle for the road, or serve cold in a glass.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-milk-greek-yogurt-mango",
    name: { en: "Mango Milk & Greek Yogurt Shake", hindi: "मैंगो मिल्क एंड ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-322892", grams: 180 }, // whole milk
      { foodId: "usda-169910", grams: 100 }, // mango
    ],
    method: [
      "Peel the mango and cut the flesh from the stone.",
      "Pour the whole milk into the blender, add the Greek yogurt and the mango.",
      "Blend on high for a full minute, until the mango fibres have disappeared and the shake is glossy.",
      "Rest 2 minutes, pour, and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-turmeric-milk-greek-yogurt",
    name: { en: "Golden Turmeric Milk Shake", hindi: "गोल्डन टर्मरिक मिल्क शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-330137", grams: 180 }, // greek yogurt
      { foodId: "usda-322892", grams: 180 }, // whole milk
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Peel the banana and break it into chunks — it sweetens the turmeric without any added sugar.",
      "Pour the whole milk into the blender and whisk the turmeric into it first, so no dry pockets survive.",
      "Add the Greek yogurt and banana; blend on high for 45 seconds, until deep gold and smooth.",
      "Serve cold. Turmeric stains — rinse the blender straight away.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-ricotta-banana",
    name: { en: "Banana Ricotta Shake", hindi: "बनाना रिकोटा शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-323444", grams: 170 }, // ricotta
      { foodId: "usda-330137", grams: 130 }, // greek yogurt
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Peel the banana and break it into chunks.",
      "Put the ricotta and Greek yogurt in the blender with a splash of water and blend for 30 seconds, until the ricotta's grain has smoothed out.",
      "Add the banana and blend on high for 45 seconds more.",
      "The texture should be like a thin cheesecake filling. Serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-ricotta-strawberry",
    name: { en: "Strawberry Ricotta Shake", hindi: "स्ट्रॉबेरी रिकोटा शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-323444", grams: 160 }, // ricotta
      { foodId: "usda-330137", grams: 140 }, // greek yogurt
      { foodId: "usda-327699", grams: 90 }, // strawberries
    ],
    method: [
      "Hull the strawberries and halve them.",
      "Blend the ricotta and Greek yogurt with a splash of water for 30 seconds, until smooth.",
      "Add the strawberries and blend on high for 45 seconds, until pale pink and uniform.",
      "Pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-overnight-oat-banana",
    name: { en: "Overnight Oat Banana Shake", hindi: "ओवरनाइट ओट बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 50 }, // oats
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "The night before (or at least 30 minutes ahead), stir the oats into the whole milk and Greek yogurt and refrigerate — soaked oats blend into silk and are gentler to digest.",
      "Peel the banana and break it into chunks.",
      "Tip the oat mixture into the blender, add the banana, and blend on high for a full minute.",
      "The shake should be thick, almost spoonable. Serve cold, straight from the glass.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder", "fridge"],
    noCook: true,
  },
  {
    id: "dish-shake-oat-apple-greek-yogurt",
    name: { en: "Apple Oat Greek Yogurt Shake", hindi: "एप्पल ओट ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 45 }, // oats
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-171688", grams: 100 }, // apple
      { foodId: "usda-322892", grams: 50 }, // whole milk
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Stir the oats into the Greek yogurt and whole milk and rest for 10 minutes to soften.",
      "Core the apple and cut it into chunks, skin on for the fibre.",
      "Add the oat mixture, apple and cinnamon to the blender; blend on high for a full minute, until no skin flecks remain.",
      "Pour and serve cold — it thickens a little more as it stands.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-oat-mango-greek-yogurt",
    name: { en: "Mango Oat Greek Yogurt Shake", hindi: "मैंगो ओट ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 40 }, // oats
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-169910", grams: 90 }, // mango
    ],
    method: [
      "Stir the oats into the Greek yogurt and rest for 10 minutes (or overnight) so they soften fully.",
      "Peel the mango and cut the flesh from the stone.",
      "Blend everything on high for a full minute, with a splash of water if the blades labour, until completely smooth.",
      "Serve cold — a breakfast shake that eats like a meal.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-oat-peanut-banana",
    name: { en: "Peanut Banana Oat Shake", hindi: "पीनट बनाना ओट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346396", grams: 35 }, // oats
      { foodId: "usda-330137", grams: 170 }, // greek yogurt
      { foodId: "usda-172430", grams: 20 }, // peanuts
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Stir the oats into the Greek yogurt and rest for 10 minutes to soften.",
      "Add the peanuts to the blender with a splash of water and blend for 30 seconds into a rough peanut paste.",
      "Add the oat-yogurt mixture and the peeled, chunked banana; blend on high for a full minute.",
      "Pour and serve cold — thick, nutty and filling.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-peanut-banana-greek-yogurt",
    name: { en: "Peanut Banana Greek Yogurt Shake", hindi: "पीनट बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172430", grams: 35 }, // peanuts
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-173944", grams: 80 }, // banana
      { foodId: "usda-322892", grams: 60 }, // whole milk
    ],
    method: [
      "Add the peanuts and whole milk to the blender and blend for a full minute into a smooth peanut milk — this first pass decides whether the shake is silky or gritty.",
      "Peel the banana and break it in; add the Greek yogurt.",
      "Blend on high for 45 seconds, until thick and uniform.",
      "Pour and serve cold. The peanut makes this the most dessert-like shake in the wave — with no added sugar in it.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-peanut-strawberry-greek-yogurt",
    name: { en: "Peanut Strawberry Greek Yogurt Shake", hindi: "पीनट स्ट्रॉबेरी ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172430", grams: 30 }, // peanuts
      { foodId: "usda-330137", grams: 200 }, // greek yogurt
      { foodId: "usda-327699", grams: 100 }, // strawberries
    ],
    method: [
      "Blend the peanuts with a splash of water for a full minute, until they form a smooth paste.",
      "Hull the strawberries and add them with the Greek yogurt.",
      "Blend on high for 45 seconds, until pink and completely smooth.",
      "Serve cold at once.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-almond-banana-greek-yogurt",
    name: { en: "Almond Banana Greek Yogurt Shake", hindi: "आमंड बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346393", grams: 30 }, // almonds
      { foodId: "usda-330137", grams: 210 }, // greek yogurt
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Blend the almonds with a splash of water for a full minute, until they break down into a smooth almond paste — patience here is the difference between silky and gritty.",
      "Peel the banana and add it with the Greek yogurt.",
      "Blend on high for 45 seconds, until uniform and thick.",
      "Pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-almond-cardamom",
    name: { en: "Almond Cardamom Shake", hindi: "आमंड कार्डमम शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346393", grams: 25 }, // almonds
      { foodId: "usda-330137", grams: 200 }, // greek yogurt
      { foodId: "usda-322892", grams: 60 }, // whole milk
      { foodId: "usda-170919", grams: 1 }, // cardamom
    ],
    method: [
      "Crush the cardamom and pick out the seeds; discard the husks.",
      "Blend the almonds, cardamom seeds and whole milk for a full minute, until the almonds have become a smooth, fragrant milk.",
      "Add the Greek yogurt and blend on high for 30 seconds more.",
      "Serve cold — a badam-doodh style shake, sweetened by nothing but the almonds and yogurt.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-cashew-mango-greek-yogurt",
    name: { en: "Cashew Mango Greek Yogurt Shake", hindi: "कैश्यू मैंगो ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2515374", grams: 30 }, // cashews
      { foodId: "usda-330137", grams: 210 }, // greek yogurt
      { foodId: "usda-169910", grams: 90 }, // mango
    ],
    method: [
      "Blend the cashews with a splash of water for 45 seconds into a smooth cream.",
      "Peel the mango, cut the flesh from the stone, and add it with the Greek yogurt.",
      "Blend on high for a full minute, until glossy and completely smooth.",
      "Rest 2 minutes, pour, and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-walnut-banana-greek-yogurt",
    name: { en: "Walnut Banana Greek Yogurt Shake", hindi: "वॉलनट बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346394", grams: 30 }, // walnuts
      { foodId: "usda-330137", grams: 220 }, // greek yogurt
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Blend the walnuts with a splash of water for 45 seconds, until they form a smooth paste.",
      "Peel the banana and add it with the Greek yogurt.",
      "Blend on high for 45 seconds, until thick and uniform — a faint walnut texture is fine and pleasant.",
      "Serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-mixed-seed-banana",
    name: { en: "Mixed Seed Banana Shake", hindi: "मिक्स्ड सीड बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2515380", grams: 15 }, // pumpkin seeds
      { foodId: "usda-2515381", grams: 15 }, // sunflower seeds
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Put the pumpkin seeds, sunflower seeds and sesame seeds in the blender with a splash of water and blend for a full minute, until the seeds have broken down as far as they will go.",
      "Peel the banana and add it with the Greek yogurt.",
      "Blend on high for 45 seconds more, until thick and speckled but smooth-drinking.",
      "Serve cold — expect gentle seed texture; that is the fibre, and it is meant to be there.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-pumpkin-seed-mango",
    name: { en: "Pumpkin Seed Mango Shake", hindi: "पंपकिन सीड मैंगो शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2515380", grams: 25 }, // pumpkin seeds
      { foodId: "usda-330137", grams: 200 }, // greek yogurt
      { foodId: "usda-169910", grams: 80 }, // mango
    ],
    method: [
      "Blend the pumpkin seeds with a splash of water for a full minute into a smooth seed paste.",
      "Peel the mango, cut the flesh from the stone, and add it with the Greek yogurt.",
      "Blend on high for a full minute, until completely smooth and pale gold-green.",
      "Pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sesame-banana-greek-yogurt",
    name: { en: "Sesame Banana Greek Yogurt Shake", hindi: "सेसमी बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-170150", grams: 25 }, // sesame seeds
      { foodId: "usda-330137", grams: 210 }, // greek yogurt
      { foodId: "usda-173944", grams: 80 }, // banana
    ],
    method: [
      "Blend the sesame seeds with a splash of water for a full minute — sesame is stubborn and needs the time to turn creamy rather than gritty.",
      "Peel the banana and add it with the Greek yogurt.",
      "Blend on high for 45 seconds, until thick and uniform.",
      "Serve cold — a til shake with a deep, nutty flavour.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sunflower-strawberry",
    name: { en: "Sunflower Strawberry Shake", hindi: "सनफ्लावर स्ट्रॉबेरी शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2515381", grams: 25 }, // sunflower seeds
      { foodId: "usda-330137", grams: 210 }, // greek yogurt
      { foodId: "usda-327699", grams: 90 }, // strawberries
    ],
    method: [
      "Blend the sunflower seeds with a splash of water for a full minute into a smooth paste.",
      "Hull the strawberries and add them with the Greek yogurt.",
      "Blend on high for 45 seconds, until pink and smooth.",
      "Pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-boiled-egg-banana",
    name: { en: "Boiled Egg Banana Shake", hindi: "बॉइल्ड एग बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-330137", grams: 150 }, // greek yogurt
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Boil the eggs for 9 minutes, cool them under cold water, and peel. Warm egg makes a shake taste eggy — let them cool fully, or chill them.",
      "Peel the banana and break it into chunks.",
      "Put the eggs, Greek yogurt and banana in the blender with a splash of water and blend on high for a full minute, until no trace of egg white remains visible.",
      "Serve cold at once. Blended smooth and chilled, the egg disappears — what is left is a thick, custard-like banana shake.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-shake-boiled-egg-mango",
    name: { en: "Boiled Egg Mango Shake", hindi: "बॉइल्ड एग मैंगो शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-330137", grams: 150 }, // greek yogurt
      { foodId: "usda-169910", grams: 80 }, // mango
    ],
    method: [
      "Boil the eggs for 9 minutes, cool under cold water, peel, and let them go completely cold.",
      "Peel the mango and cut the flesh from the stone.",
      "Blend the eggs, Greek yogurt and mango on high for a full minute, until completely smooth.",
      "Serve cold at once — the mango's perfume covers the egg entirely.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-egg-oat-breakfast",
    name: { en: "Egg & Oat Breakfast Shake", hindi: "एग एंड ओट ब्रेकफास्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-2346396", grams: 30 }, // oats
      { foodId: "usda-330137", grams: 120 }, // greek yogurt
      { foodId: "usda-322892", grams: 80 }, // whole milk
    ],
    method: [
      "Boil the eggs for 9 minutes, cool under cold water, peel, and chill.",
      "Stir the oats into the whole milk and Greek yogurt and rest for 10 minutes to soften.",
      "Add the eggs and blend everything on high for a full minute, until thick and completely smooth.",
      "Pour and serve cold — a whole breakfast (eggs, oats, yogurt) in one glass.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-shake-egg-cottage-cheese-banana",
    name: { en: "Boiled Egg & Cottage Cheese Banana Shake", hindi: "बॉइल्ड एग एंड कॉटेज चीज़ बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 100 }, // eggs
      { foodId: "usda-328841", grams: 130 }, // cottage cheese
      { foodId: "usda-173944", grams: 70 }, // banana
      { foodId: "usda-322559", grams: 50 }, // skim milk
    ],
    method: [
      "Boil the eggs for 9 minutes, cool under cold water, peel, and let them go cold.",
      "Blend the cottage cheese with the skim milk for 30 seconds first, until silky.",
      "Peel the banana; add it and the eggs, and blend on high for a full minute, until no curd or egg flecks remain.",
      "Serve cold at once.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-tofu-banana-peanut",
    name: { en: "Tofu Banana Peanut Smoothie", hindi: "टोफू बनाना पीनट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 230 }, // tofu
      { foodId: "usda-172430", grams: 20 }, // peanuts
      { foodId: "usda-173944", grams: 80 }, // banana
    ],
    method: [
      "Blend the peanuts with a splash of water for 45 seconds into a rough paste.",
      "Drain the tofu and break it into the blender; peel the banana and add it in chunks.",
      "Blend on high for a full minute, until the tofu has completely disappeared and the smoothie is thick and uniform.",
      "Add water a splash at a time if it is too thick to pour. Serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-tofu-mango-pumpkin-seed",
    name: { en: "Tofu Mango Pumpkin Seed Smoothie", hindi: "टोफू मैंगो पंपकिन सीड स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 240 }, // tofu
      { foodId: "usda-169910", grams: 100 }, // mango
      { foodId: "usda-2515380", grams: 10 }, // pumpkin seeds
    ],
    method: [
      "Blend the pumpkin seeds with a splash of water for 45 seconds into a paste.",
      "Peel the mango and cut the flesh from the stone; drain the tofu and break it in.",
      "Add the mango and blend on high for a full minute, until glossy and smooth.",
      "Serve cold — the tofu is undetectable; what you taste is mango.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-tofu-strawberry-almond",
    name: { en: "Tofu Strawberry Almond Smoothie", hindi: "टोफू स्ट्रॉबेरी आमंड स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 240 }, // tofu
      { foodId: "usda-327699", grams: 110 }, // strawberries
      { foodId: "usda-2346393", grams: 15 }, // almonds
    ],
    method: [
      "Blend the almonds with a splash of water for a full minute into a smooth paste.",
      "Hull the strawberries; drain the tofu and break it into the blender.",
      "Add the strawberries and blend on high for 45 seconds, until pink and completely smooth.",
      "Pour and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-tofu-pineapple-coconut",
    name: { en: "Tofu Pineapple Coconut Smoothie", hindi: "टोफू पाइनएप्पल कोकोनट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 230 }, // tofu
      { foodId: "usda-170172", grams: 60 }, // coconut milk
      { foodId: "usda-169124", grams: 100 }, // pineapple
      { foodId: "usda-2515380", grams: 10 }, // pumpkin seeds
    ],
    method: [
      "Blend the pumpkin seeds with the coconut milk for 45 seconds, until the seeds have broken down.",
      "Drain the tofu and break it in; add the pineapple chunks.",
      "Blend on high for a full minute, until tropical, thick and smooth.",
      "Serve very cold — this is the piña colada of the wave, built on tofu instead of rum and cream.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-tofu-oat-banana-peanut",
    name: { en: "Tofu Oat Banana Peanut Smoothie", hindi: "टोफू ओट बनाना पीनट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 220 }, // tofu
      { foodId: "usda-2346396", grams: 30 }, // oats
      { foodId: "usda-172430", grams: 15 }, // peanuts
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Blend the peanuts and oats with a splash of water for 45 seconds into a rough, thick base.",
      "Drain the tofu and break it in; peel the banana and add it in chunks.",
      "Blend on high for a full minute, until completely smooth — add water a splash at a time to reach a pourable thickness.",
      "Serve cold; a filling vegan breakfast smoothie.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-tofu-spinach-mango",
    name: { en: "Tofu Spinach Mango Smoothie", hindi: "टोफू स्पिनच मैंगो स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 230 }, // tofu
      { foodId: "usda-168462", grams: 50 }, // spinach
      { foodId: "usda-169910", grams: 90 }, // mango
      { foodId: "usda-2515380", grams: 8 }, // pumpkin seeds
    ],
    method: [
      "Blend the pumpkin seeds and spinach with a splash of water first, for 45 seconds, until the spinach has broken down to a green liquid with no leaf flecks.",
      "Peel the mango and cut the flesh from the stone; drain the tofu and break it in.",
      "Add both and blend on high for a full minute, until smooth and bright green-gold.",
      "Serve cold at once, before the green dulls.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-tempeh-banana-peanut",
    name: { en: "Tempeh Banana Peanut Smoothie", hindi: "टेम्पेह बनाना पीनट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 110 }, // tempeh
      { foodId: "usda-173944", grams: 90 }, // banana
      { foodId: "usda-172430", grams: 10 }, // peanuts
    ],
    method: [
      "Steam the tempeh for 10 minutes — steaming softens it, mellows its tang and makes it blend smooth. Let it cool completely; warm tempeh makes a warm smoothie.",
      "Blend the peanuts with a splash of water for 30 seconds into a paste.",
      "Add the tempeh in chunks and the peeled banana; blend on high for a full minute, until no tempeh grain remains.",
      "Thin with a splash of water if needed and serve cold.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-tempeh-mango-oat",
    name: { en: "Tempeh Mango Oat Smoothie", hindi: "टेम्पेह मैंगो ओट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 110 }, // tempeh
      { foodId: "usda-169910", grams: 100 }, // mango
      { foodId: "usda-2346396", grams: 15 }, // oats
    ],
    method: [
      "Steam the tempeh for 10 minutes and let it cool completely.",
      "Stir the oats into a splash of water and rest for 5 minutes to soften.",
      "Peel the mango and cut the flesh from the stone; add it, the tempeh and the oats to the blender.",
      "Blend on high for a full minute, until completely smooth. Serve cold.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-tempeh-strawberry-oat",
    name: { en: "Tempeh Strawberry Oat Smoothie", hindi: "टेम्पेह स्ट्रॉबेरी ओट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 105 }, // tempeh
      { foodId: "usda-2346396", grams: 20 }, // oats
      { foodId: "usda-327699", grams: 90 }, // strawberries
      { foodId: "usda-2515381", grams: 5 }, // sunflower seeds
    ],
    method: [
      "Steam the tempeh for 10 minutes and let it cool completely.",
      "Blend the sunflower seeds and oats with a splash of water for 30 seconds.",
      "Hull the strawberries; add them and the tempeh, and blend on high for a full minute, until pink and smooth.",
      "Serve cold at once.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-edamame-tofu-banana",
    name: { en: "Edamame Tofu Banana Smoothie", hindi: "एडामामे टोफू बनाना स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 150 }, // edamame
      { foodId: "usda-172448", grams: 100 }, // tofu
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Boil the edamame beans for 3–4 minutes until tender, drain, and let them cool — hot beans make a warm, dull smoothie.",
      "Drain the tofu and break it into the blender; add the cooled edamame.",
      "Peel the banana and add it in chunks; blend on high for a full minute, until completely smooth.",
      "Serve cold — pale green, thick and quietly sweet from the banana alone.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-edamame-tofu-mango-mint",
    name: { en: "Edamame Tofu Mango Mint Smoothie", hindi: "एडामामे टोफू मैंगो मिंट स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 160 }, // edamame
      { foodId: "usda-172448", grams: 90 }, // tofu
      { foodId: "usda-169910", grams: 70 }, // mango
      { foodId: "usda-173475", grams: 2 }, // spearmint
    ],
    method: [
      "Boil the edamame beans for 3–4 minutes, drain and cool completely.",
      "Peel the mango and cut the flesh from the stone; drain the tofu and break it in.",
      "Add the edamame, mango and spearmint leaves; blend on high for a full minute, until smooth and flecked green.",
      "Serve very cold — the mint lifts the whole glass.",
    ],
    timeMinutes: 15,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-edamame-peanut-oat-banana",
    name: { en: "Edamame Peanut Oat Banana Smoothie", hindi: "एडामामे पीनट ओट बनाना स्मूदी" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168410", grams: 120 }, // edamame
      { foodId: "usda-172430", grams: 35 }, // peanuts
      { foodId: "usda-2346396", grams: 25 }, // oats
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Boil the edamame beans for 3–4 minutes, drain and cool.",
      "Blend the peanuts and oats with a splash of water for 45 seconds into a thick base.",
      "Add the edamame and the peeled, chunked banana; blend on high for a full minute, until smooth.",
      "Serve cold — the most fibre-rich smoothie in the wave.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-soy-milk-banana",
    name: { en: "Homemade Soy Milk Banana Shake", hindi: "होममेड सोया मिल्क बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174270", grams: 60 }, // soybeans (for the soy milk)
      { foodId: "usda-172430", grams: 10 }, // peanuts
      { foodId: "usda-173944", grams: 80 }, // banana
    ],
    method: [
      "Soak the soybeans in plenty of water for at least 8 hours (or overnight); drain and rinse. Rub the beans between your palms to loosen some skins and skim them off.",
      "Blend the beans with 500 ml fresh water for 2 minutes, until milky and fine. Pour into a pan, bring to a gentle boil, and simmer for 15 minutes, skimming the foam and stirring — raw soy must be properly cooked. The soy milk is done when it smells sweet and nutty, not beany.",
      "Cool the soy milk completely (this batch is the whole recipe's soy milk; it keeps 2 days in the fridge).",
      "Blend the peanuts with a splash of the soy milk into a paste, add the rest of the soy milk and the peeled, chunked banana, and blend for 45 seconds.",
      "Serve cold — a from-scratch protein shake with nothing bought in a tub.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-soy-milk-mango-pumpkin-seed",
    name: { en: "Homemade Soy Milk Mango Shake", hindi: "होममेड सोया मिल्क मैंगो शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-174270", grams: 60 }, // soybeans (for the soy milk)
      { foodId: "usda-169910", grams: 100 }, // mango
      { foodId: "usda-2515380", grams: 10 }, // pumpkin seeds
    ],
    method: [
      "Soak the soybeans for at least 8 hours; drain, rinse, and rub off the loose skins.",
      "Blend the beans with 500 ml water for 2 minutes, then simmer the milk gently for 15 minutes, skimming and stirring, until it smells sweet rather than beany. Cool completely.",
      "Blend the pumpkin seeds with a splash of the soy milk into a paste.",
      "Peel the mango and cut the flesh from the stone; add it and the remaining soy milk, and blend for 45 seconds, until smooth. Serve cold.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-sattu-banana",
    name: { en: "Sattu Banana Shake", hindi: "सत्तू बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 45 }, // besan (sattu — roasted chickpea flour)
      { foodId: "usda-330137", grams: 170 }, // greek yogurt
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Whisk the sattu (roasted chickpea flour) into a splash of water to a lump-free slurry — sattu clumps if it meets the blender dry.",
      "Peel the banana and break it into chunks.",
      "Add the slurry, Greek yogurt and banana to the blender; blend on high for 45 seconds, until smooth and creamy.",
      "Serve cold — Bihar's original protein drink, rebuilt on Greek yogurt.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sattu-mango",
    name: { en: "Sattu Mango Shake", hindi: "सत्तू मैंगो शेक" },
    category: "shake",
    servings: 1,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 45 }, // besan (sattu — roasted chickpea flour)
      { foodId: "usda-330137", grams: 170 }, // greek yogurt
      { foodId: "usda-169910", grams: 80 }, // mango
    ],
    method: [
      "Whisk the sattu into a splash of water to a smooth slurry, with no dry pockets.",
      "Peel the mango and cut the flesh from the stone.",
      "Blend the slurry, Greek yogurt and mango on high for a full minute, until completely smooth.",
      "Rest 2 minutes, pour, and serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sattu-oat",
    name: { en: "Sattu Oat Shake", hindi: "सत्तू ओट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 40 }, // besan (sattu — roasted chickpea flour)
      { foodId: "usda-330137", grams: 160 }, // greek yogurt
      { foodId: "usda-2346396", grams: 20 }, // oats
    ],
    method: [
      "Stir the oats into the Greek yogurt and rest for 10 minutes to soften.",
      "Whisk the sattu into a splash of water to a lump-free slurry.",
      "Blend everything on high for a full minute, until thick and smooth.",
      "Serve cold — two of India's cheapest protein sources in one glass.",
    ],
    timeMinutes: 15,
    budgetTier: 1,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sattu-tofu-banana",
    name: { en: "Sattu Tofu Banana Shake", hindi: "सत्तू टोफू बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 50 }, // besan (sattu — roasted chickpea flour)
      { foodId: "usda-172448", grams: 150 }, // tofu
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Whisk the sattu into a splash of water to a smooth slurry.",
      "Drain the tofu and break it into the blender; peel the banana and add it in chunks.",
      "Add the slurry and blend on high for a full minute, until the tofu has disappeared and the shake is uniform.",
      "Thin with a splash of water if needed. Serve cold — a fully plant-based sattu shake.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sattu-cottage-cheese-banana",
    name: { en: "Sattu Cottage Cheese Banana Shake", hindi: "सत्तू कॉटेज चीज़ बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "india",
    lines: [
      { foodId: "usda-174288", grams: 35 }, // besan (sattu — roasted chickpea flour)
      { foodId: "usda-328841", grams: 160 }, // cottage cheese
      { foodId: "usda-173944", grams: 60 }, // banana
      { foodId: "usda-322559", grams: 50 }, // skim milk
    ],
    method: [
      "Blend the cottage cheese with the skim milk for 30 seconds, until silky.",
      "Whisk the sattu into a splash of water to a lump-free slurry.",
      "Peel the banana; add it and the slurry, and blend on high for 45 seconds, until smooth.",
      "Serve cold.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-quinoa-banana",
    name: { en: "Quinoa Banana Shake", hindi: "क्विनोआ बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 40 }, // quinoa (dry)
      { foodId: "usda-330137", grams: 190 }, // greek yogurt
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Rinse the quinoa well under running water — unrinsed quinoa tastes bitter. Cook it in 120 ml water for 15 minutes until the spirals unfurl, then spread it on a plate to cool completely (warm quinoa melts the shake's chill and thins it).",
      "Peel the banana and break it into chunks.",
      "Blend the cooled quinoa with the Greek yogurt and banana on high for a full minute, until no quinoa grain remains intact.",
      "Serve cold — a shake with a complete-protein grain at its base.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-shake-quinoa-mango",
    name: { en: "Quinoa Mango Shake", hindi: "क्विनोआ मैंगो शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 40 }, // quinoa (dry)
      { foodId: "usda-330137", grams: 200 }, // greek yogurt
      { foodId: "usda-169910", grams: 70 }, // mango
    ],
    method: [
      "Rinse the quinoa, cook it in 120 ml water for 15 minutes, and cool it completely.",
      "Peel the mango and cut the flesh from the stone.",
      "Blend the quinoa, Greek yogurt and mango on high for a full minute, until completely smooth.",
      "Rest 2 minutes, pour, and serve cold.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-shake-spinach-banana-greek-yogurt",
    name: { en: "Spinach Banana Greek Yogurt Shake", hindi: "स्पिनच बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-330137", grams: 220 }, // greek yogurt
      { foodId: "usda-173944", grams: 90 }, // banana
    ],
    method: [
      "Blend the spinach with a splash of water first, for 30 seconds, until it is a smooth green liquid with no leaf pieces — this order keeps the shake silky instead of flecked.",
      "Peel the banana and add it with the Greek yogurt.",
      "Blend on high for 45 seconds, until bright green and uniform.",
      "Serve at once — you taste banana and yogurt; the spinach only shows in the colour.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-avocado-greek-yogurt-lemon",
    name: { en: "Avocado Greek Yogurt Shake", hindi: "एवोकाडो ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-322559", grams: 60 }, // skim milk
      { foodId: "usda-167746", grams: 20 }, // lemon
    ],
    method: [
      "Halve the avocado, remove the stone, and scoop the flesh into the blender. Squeeze the lemon over it straight away — the acid keeps the colour bright green.",
      "Add the Greek yogurt and skim milk.",
      "Blend on high for 45 seconds, until completely smooth and pale green.",
      "Serve immediately; avocado shakes brown and dull if they stand.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-sweet-potato-greek-yogurt",
    name: { en: "Sweet Potato Greek Yogurt Shake", hindi: "स्वीट पोटैटो ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346404", grams: 120 }, // sweet potato
      { foodId: "usda-330137", grams: 220 }, // greek yogurt
      { foodId: "usda-322892", grams: 50 }, // whole milk
      { foodId: "usda-171320", grams: 1 }, // cinnamon
    ],
    method: [
      "Boil or bake the sweet potato until completely soft — a knife should slide through with no resistance. Cool it fully and slip off the skin.",
      "Put the sweet potato, Greek yogurt, whole milk and cinnamon in the blender.",
      "Blend on high for a full minute, until the shake is smooth, rust-orange and thick.",
      "Serve cold — it drinks like a spiced pie filling, with the protein of a meal.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven", "mixer_grinder"],
  },
  {
    id: "dish-shake-carrot-orange-greek-yogurt",
    name: { en: "Carrot Orange Greek Yogurt Shake", hindi: "कैरट ऑरेंज ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-2258586", grams: 80 }, // carrot
      { foodId: "usda-746771", grams: 110 }, // orange
      { foodId: "usda-330137", grams: 230 }, // greek yogurt
      { foodId: "usda-169231", grams: 5 }, // ginger
    ],
    method: [
      "Scrub the carrot and chop it small — small pieces are what let a home blender break carrot down fully. Peel the ginger and slice it thin. Peel the orange into segments, removing pips and pith.",
      "Blend the carrot, ginger and orange with a splash of water first, for a full minute, until no carrot grit remains.",
      "Add the Greek yogurt and blend on high for 30 seconds more.",
      "Serve at once, cold and bright.",
    ],
    timeMinutes: 10,
    budgetTier: 2,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-coconut-banana-greek-yogurt",
    name: { en: "Coconut Banana Greek Yogurt Shake", hindi: "कोकोनट बनाना ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-170169", grams: 50 }, // coconut meat
      { foodId: "usda-170172", grams: 80 }, // coconut milk
      { foodId: "usda-330137", grams: 220 }, // greek yogurt
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Blend the coconut meat with the coconut milk first, for a full minute, until the coconut has broken down as smooth as it will go.",
      "Peel the banana and add it with the Greek yogurt.",
      "Blend on high for 45 seconds more, until thick and uniform.",
      "Serve cold — the richest shake in the wave; a small glass goes a long way.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-whey-banana-milk",
    name: { en: "Whey Banana Milk Shake", hindi: "व्हे बनाना मिल्क शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173177", grams: 40 }, // whey protein powder isolate
      { foodId: "usda-322892", grams: 250 }, // whole milk
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Peel the banana and break it into chunks.",
      "Pour the whole milk into the blender and blend it with the banana for 30 seconds first.",
      "Add the whey protein powder last and blend for just 15–20 seconds — powder added at the end, and blended briefly, stays smooth instead of frothing into foam.",
      "Pour and drink at once. The classic post-training shake, on a verified generic whey isolate.",
    ],
    timeMinutes: 5,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-whey-mango-milk",
    name: { en: "Whey Mango Milk Shake", hindi: "व्हे मैंगो मिल्क शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173177", grams: 40 }, // whey protein powder isolate
      { foodId: "usda-322892", grams: 220 }, // whole milk
      { foodId: "usda-169910", grams: 90 }, // mango
    ],
    method: [
      "Peel the mango and cut the flesh from the stone.",
      "Blend the whole milk and mango for 30 seconds, until the mango has broken down.",
      "Add the whey protein powder and blend 15–20 seconds more, just until it disappears.",
      "Serve cold at once.",
    ],
    timeMinutes: 5,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-whey-strawberry-greek-yogurt",
    name: { en: "Whey Strawberry Greek Yogurt Shake", hindi: "व्हे स्ट्रॉबेरी ग्रीक योगर्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173177", grams: 35 }, // whey protein powder isolate
      { foodId: "usda-330137", grams: 120 }, // greek yogurt
      { foodId: "usda-327699", grams: 90 }, // strawberries
      { foodId: "usda-322559", grams: 80 }, // skim milk
    ],
    method: [
      "Hull the strawberries and halve them.",
      "Blend the Greek yogurt, skim milk and strawberries for 30 seconds, until pink and smooth.",
      "Add the whey protein powder last; blend 15–20 seconds, until just combined — longer blending whips it to foam.",
      "Pour and serve cold.",
    ],
    timeMinutes: 5,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-whey-oat-banana",
    name: { en: "Whey Oat Banana Breakfast Shake", hindi: "व्हे ओट बनाना ब्रेकफास्ट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173177", grams: 35 }, // whey protein powder isolate
      { foodId: "usda-2346396", grams: 30 }, // oats
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Stir the oats into the whole milk and rest for 10 minutes to soften (or overnight in the fridge).",
      "Peel the banana; blend the oat-milk mixture with the banana for 45 seconds, until smooth.",
      "Add the whey protein powder and blend 15–20 seconds more.",
      "Serve cold — oats, milk, banana and whey: a full breakfast's protein in one glass.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-shake-whey-peanut-banana",
    name: { en: "Whey Peanut Banana Shake", hindi: "व्हे पीनट बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173177", grams: 35 }, // whey protein powder isolate
      { foodId: "usda-172430", grams: 20 }, // peanuts
      { foodId: "usda-322892", grams: 200 }, // whole milk
      { foodId: "usda-173944", grams: 60 }, // banana
    ],
    method: [
      "Blend the peanuts with the whole milk for a full minute, into a smooth peanut milk.",
      "Peel the banana and blend it in for 20 seconds.",
      "Add the whey protein powder last and blend 15–20 seconds, until just combined.",
      "Pour and drink cold.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-whey-cottage-cheese-banana",
    name: { en: "Whey Cottage Cheese Banana Shake", hindi: "व्हे कॉटेज चीज़ बनाना शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173177", grams: 30 }, // whey protein powder isolate
      { foodId: "usda-328841", grams: 130 }, // cottage cheese
      { foodId: "usda-173944", grams: 70 }, // banana
      { foodId: "usda-322559", grams: 60 }, // skim milk
    ],
    method: [
      "Blend the cottage cheese with the skim milk for 30 seconds, until silky.",
      "Peel the banana and blend it in for 20 seconds.",
      "Add the whey protein powder last; blend 15–20 seconds, until just combined.",
      "Serve cold — the highest-protein shake in the wave.",
    ],
    timeMinutes: 10,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-soy-powder-banana-oat-peanut",
    name: { en: "Soy Protein Banana Oat Shake", hindi: "सोया प्रोटीन बनाना ओट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173181", grams: 40 }, // soy protein powder
      { foodId: "usda-2346396", grams: 25 }, // oats
      { foodId: "usda-172430", grams: 15 }, // peanuts
      { foodId: "usda-173944", grams: 70 }, // banana
    ],
    method: [
      "Blend the peanuts and oats with a splash of water for 45 seconds into a thick base; rest 5 minutes so the oats soften.",
      "Peel the banana and blend it in for 20 seconds.",
      "Add the soy protein powder last and blend 15–20 seconds, until just combined.",
      "Serve cold — a fully plant-based powder shake.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-soy-powder-mango-coconut",
    name: { en: "Soy Protein Mango Coconut Shake", hindi: "सोया प्रोटीन मैंगो कोकोनट शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173181", grams: 40 }, // soy protein powder
      { foodId: "usda-170172", grams: 60 }, // coconut milk
      { foodId: "usda-169910", grams: 90 }, // mango
      { foodId: "usda-2346396", grams: 15 }, // oats
    ],
    method: [
      "Stir the oats into the coconut milk and rest for 5 minutes to soften.",
      "Peel the mango and cut the flesh from the stone; blend it with the oat-coconut mixture for 30 seconds.",
      "Add the soy protein powder last; blend 15–20 seconds, until just combined.",
      "Serve cold.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
  {
    id: "dish-shake-soy-powder-strawberry-almond",
    name: { en: "Soy Protein Strawberry Almond Shake", hindi: "सोया प्रोटीन स्ट्रॉबेरी आमंड शेक" },
    category: "shake",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-173181", grams: 40 }, // soy protein powder
      { foodId: "usda-327699", grams: 100 }, // strawberries
      { foodId: "usda-2346393", grams: 15 }, // almonds
      { foodId: "usda-2346396", grams: 10 }, // oats
    ],
    method: [
      "Blend the almonds and oats with a splash of water for a full minute, until the almonds have broken down smoothly.",
      "Hull the strawberries and blend them in for 20 seconds.",
      "Add the soy protein powder last; blend 15–20 seconds, until just combined.",
      "Pour and serve cold.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["mixer_grinder"],
    noCook: true,
  },
];
