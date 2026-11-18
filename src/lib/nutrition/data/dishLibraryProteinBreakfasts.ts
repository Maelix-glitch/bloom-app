/**
 * Protein wave PW-2 — high-protein breakfasts and protein snacks.
 *
 * The owner's protein mandate (2026-11-17): deepen the dish pool for
 * dish-first plans with protein-first additions only. Every dish here
 * clears the same hard bar as the international waves — at least 25 g
 * of protein in a serving, COMPUTED by `dishNutrients` from the lines
 * below and pinned by dishLibraryProteinBreakfasts.test.ts — and the
 * pool is weighted to breakfast, the slot the dish-first composer
 * draws its anchors from, plus a shelf of substantial snacks.
 *
 * Composed only from the USDA reference set: no protein powder, no
 * beef, no pork, no branded items. Where a classic needs an ingredient
 * the set does not carry (feta, soy sauce, fish sauce, capers), the
 * dish is composed truthfully without it or left out; the method never
 * names an ingredient that is not a line. Cottage cheese
 * (usda-328841) is the data layer's paneer stand-in, as in the mains
 * library — dishes keep their names, the line shows the ingredient.
 * No dish duplicates an existing library dish by name or by recipe
 * (checked against the whole library, normalised — see the wave test).
 */

import type { Dish } from "../dishes";

export const PW2_DISHES: readonly Dish[] = [
  /* --------------------------- India breakfasts --------------------------- */
  {
    id: "dish-pw2-ros-omelette",
    name: { en: "Ros Omelette (Goan Egg in Chicken Gravy)", hindi: "रोस ऑमलेट" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2646170", grams: 180 }, // chicken breast
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-170172", grams: 80 }, // coconut milk
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cut the chicken into small bite-size pieces; season with the salt and turmeric and set aside for 10 minutes.",
      "Heat half the oil in a pan over medium heat; fry the onion for 5–6 minutes until deep golden at the edges.",
      "Add the garlic, ginger and green chilli; fry 1 minute, then add the tomato and cumin and cook 5 minutes into a thick, glossy masala.",
      "Add the chicken; sear for 3 minutes, then pour in the coconut milk and 100 ml water, cover and simmer 8–10 minutes until the chicken is cooked through and the gravy coats a spoon.",
      "Meanwhile whisk the eggs with a pinch of the remaining salt; heat the rest of the oil in a non-stick pan and make a plain folded omelette, 2–3 minutes per side, set but still soft in the middle.",
      "Cut the omelette into wide strips, lay them over plates and spoon the hot chicken gravy generously over — the Goan way, the omelette soaking in the ros.",
      "Rest 1 minute so the egg drinks up the gravy, and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-chicken-kothu-parotta",
    name: { en: "Chicken Kothu Parotta", hindi: "चिकन कोथु परोटा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 120 }, // white flour
      { foodId: "usda-2646170", grams: 200 }, // chicken breast
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-170427", grams: 60 }, // green sweet pepper
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with the salt and about 70 ml warm water into a soft dough; rest 20 minutes, then roll into 4 thin parottas and cook on a dry hot tawa 1–2 minutes per side until puffed and spotted. Tear into bite-size pieces.",
      "Cut the chicken into small strips; toss with the turmeric, chili powder and half the salt.",
      "Heat half the oil on a large tawa or heavy pan over high heat; sear the chicken 4–5 minutes until cooked through and charred at the edges. Set aside.",
      "In the same pan, add the remaining oil; fry the onion, pepper, garlic and ginger for 3 minutes until softening, then the tomato for 3 minutes into a rough masala.",
      "Return the chicken and the torn parotta; toss everything together for 2 minutes, chopping and mixing with two spatulas in the kothu rhythm until the bread drinks up the masala.",
      "Push to one side, pour in the beaten eggs, scramble them softly for 1 minute, then fold through the whole mixture for a final minute.",
      "Serve piled high, straight off the tawa, while it still sizzles.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-masala-egg-idli",
    name: { en: "Masala Egg Idli Fry", hindi: "मसाला अंडा इडली फ्राई" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 90 }, // rice flour
      { foodId: "usda-174259", grams: 60 }, // black gram (urad dal), dry
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-172337", grams: 16 }, // mustard oil
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-170924", grams: 2 }, // curry powder
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the black gram for 5 hours; grind to a fluffy batter, stir in the rice flour and salt, and ferment 8–12 hours until risen and lightly sour (the standard idli batter).",
      "Steam the batter in idli moulds for 10–12 minutes, until a skewer comes out clean; cool 10 minutes and quarter each idli.",
      "Beat the eggs with a pinch of salt. Heat a wide pan over medium heat, add a third of the mustard oil and scramble the eggs softly for 2 minutes; set aside still glossy.",
      "In the same pan heat the remaining oil; crackle the mustard seeds, then fry the onion and green chilli for 3–4 minutes until golden.",
      "Add the tomato and curry powder; cook 3 minutes into a thick masala that leaves the sides of the pan.",
      "Add the idli quarters; toss and fry 3–4 minutes until their cut faces crisp and take on the masala's colour.",
      "Fold the scrambled eggs and coriander leaves through for 1 minute and serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-mughlai-egg-paratha",
    name: { en: "Mughlai Egg Paratha", hindi: "मुग़लई अंडा पराठा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 140 }, // whole wheat flour
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-322892", grams: 60 }, // whole milk
      { foodId: "usda-171314", grams: 16 }, // ghee
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with the salt and about 80 ml warm water into a soft dough; rest 20 minutes covered.",
      "Whisk the eggs with the milk, black pepper and a pinch of salt until evenly combined; stir in the finely chopped onion, green chilli and coriander leaves.",
      "Divide the dough into 4 balls; roll each into a thin 18 cm disc, keeping the edges thinner than the centre.",
      "Heat a tawa over medium heat and brush with a little ghee; lay on a disc and cook 1 minute until the underside firms.",
      "Spoon a quarter of the egg mixture into the centre; fold the edges in to make a sealed square parcel, pressing gently.",
      "Cook 2–3 minutes per side in the remaining ghee, pressing with a spatula, until deep golden, puffed and the egg inside is just set — it should feel springy, not liquid, when pressed.",
      "Repeat for the remaining parathas and serve hot, cut corner to corner.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-egg-tadka",
    name: { en: "Egg Tadka (Bengali Dhaba-Style)", hindi: "अंडा तड़का" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174256", grams: 110 }, // mung beans, dry
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-173410", grams: 16 }, // butter
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the mung beans for 4 hours (or overnight); drain, cover with fresh water and simmer 20–25 minutes until completely soft and beginning to break down. Keep the cooking liquor.",
      "Melt half the butter in a heavy pan; fry the onion for 6–7 minutes until deep golden — the dhaba colour comes from patience here.",
      "Add the garlic, ginger, cumin, turmeric and chili powder; fry 1 minute, then the tomato and cook 5 minutes into a dark, thick masala.",
      "Add the cooked mung beans with enough of their liquor for a thick, spoonable dal; simmer 5 minutes, mashing a few beans against the side so the tadka turns creamy. Season with the salt.",
      "Beat the eggs and stir them into the hot dal in a thin stream, stirring constantly for 2 minutes — they should set in soft ribbons through the dal, not scramble into lumps.",
      "Finish with the remaining butter melting over the top and the coriander leaves; serve at once with bread or rice.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-bombay-masala-toast",
    name: { en: "Bombay Masala French Toast", hindi: "बॉम्बे मसाला फ्रेंच टोस्ट" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 120 }, // whole wheat flour
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-322559", grams: 80 }, // nonfat milk
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173410", grams: 12 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the bread first: knead the flour with the salt and about 70 ml warm water into a firm dough; rest 15 minutes, shape into a small loaf and bake at 200°C for 22–25 minutes until it sounds hollow when tapped. Cool completely, then cut 4 thick slices.",
      "Whisk the eggs with the milk, turmeric and a pinch of salt; stir in the finely chopped onion, green chilli and coriander leaves.",
      "Soak each bread slice in the egg mixture for 30 seconds per side — the crumb should drink the egg right through, not just wear it.",
      "Melt half the butter in a non-stick pan over medium heat until foaming.",
      "Fry the soaked slices 2–3 minutes per side until deep golden and puffed, the egg set all the way through with no wet shine in the centre.",
      "Repeat with the remaining butter and slices; serve hot, cut diagonally.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-sali-par-eedu",
    name: { en: "Sali Par Eedu-Style (Parsi Eggs on Crisp Potatoes)", hindi: "साली पर ईडू" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346401", grams: 300 }, // potatoes
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-172183", grams: 200 }, // egg white
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171025", grams: 20 }, // sunflower oil
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cut the potatoes into thin matchsticks (or grate coarsely); rinse in cold water and dry very well in a cloth — dry potato crisps, wet potato steams.",
      "Heat the oil in a wide non-stick pan over medium-high heat; spread the potato in an even layer with half the salt and fry undisturbed for 5 minutes until a golden crust forms underneath.",
      "Scatter the onion and green chilli over, toss once, and fry 4–5 minutes more until the sali is crisp at the edges and tender in the middle.",
      "Whisk the eggs with the egg whites, black pepper and remaining salt; pour evenly over the potato bed.",
      "Cover and cook on the lowest heat for 5–6 minutes, until the egg is just set on top with a slight wobble — the Parsi way is soft-set, never rubbery.",
      "Shower with coriander leaves, slide onto a warm plate in one piece if you can, and serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-egg-bread-upma",
    name: { en: "Egg Bread Upma", hindi: "अंडा ब्रेड उपमा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168893", grams: 110 }, // whole wheat flour
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-170419", grams: 60 }, // green peas
      { foodId: "usda-172337", grams: 16 }, // mustard oil
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the bread first: knead the flour with half the salt and about 65 ml warm water into a firm dough; rest 15 minutes, shape a small loaf and bake at 200°C for 22–25 minutes until hollow-sounding. Cool, then cut into 2 cm cubes and toast in a pan for 3 minutes until crisp at the edges.",
      "Beat the eggs with the remaining salt; scramble them softly in a third of the mustard oil for 2 minutes and set aside still glossy.",
      "Heat the remaining oil; crackle the mustard seeds, then fry the onion, ginger and green chilli for 3–4 minutes until golden.",
      "Add the tomato and peas; cook 3 minutes until the tomato softens into the onion and the peas are bright and tender.",
      "Add the bread cubes; toss for 2 minutes so they drink up the masala and crisp again in spots.",
      "Fold the scrambled eggs and coriander leaves through for 1 minute; serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-chicken-kari-dosa",
    name: { en: "Chicken Kari Dosa", hindi: "चिकन करी डोसा" },
    category: "breakfast",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-169714", grams: 100 }, // rice flour
      { foodId: "usda-174259", grams: 50 }, // black gram (urad dal), dry
      { foodId: "usda-2646170", grams: 180 }, // chicken breast
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-330458", grams: 16 }, // coconut oil
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the black gram 5 hours; grind fluffy, stir in the rice flour and salt, and ferment 8–12 hours into a dosa batter (the standard batter).",
      "Mince the chicken finely by hand. Heat half the coconut oil; fry the onion, garlic and ginger for 3 minutes, then the tomato, turmeric and chili powder for 3 minutes into a thick masala.",
      "Add the chicken with a pinch of salt; cook 6–7 minutes, breaking it fine, until cooked through and dry-ish — a spreadable kari, not a curry. Set aside; the egg goes on the dosa itself.",
      "Heat a cast-iron tawa until very hot; sprinkle water — it should sizzle off at once. Wipe, grease lightly, and spread a ladle of batter into a thick-ish dosa (kari dosa is never paper-thin).",
      "Drizzle with the remaining coconut oil; when the base is golden and crisp (2–3 minutes), spread a quarter of the chicken kari over the top and press gently.",
      "Beat the eggs, pour a thin layer over the kari, cover and cook 2 minutes until the egg just sets into the topping.",
      "Fold and serve at once; repeat for the remaining dosas.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  /* --------------------------- Kerala breakfasts --------------------------- */
  {
    id: "dish-pw2-kothu-idiyappam",
    name: { en: "Kothu Idiyappam with Chicken & Egg", hindi: "कोथु इडियप्पम" },
    category: "breakfast",
    servings: 2,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-169714", grams: 110 }, // rice flour
      { foodId: "usda-2646170", grams: 160 }, // chicken breast
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170427", grams: 60 }, // green sweet pepper
      { foodId: "usda-330458", grams: 16 }, // coconut oil
      { foodId: "usda-170169", grams: 20 }, // coconut meat
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the idiyappam: knead the rice flour with the salt and about 130 ml just-boiled water into a soft dough; press through an idiyappam mould into nests and steam 8–10 minutes until set and glossy. Cool and tease the nests apart into strands.",
      "Cut the chicken into small strips; season with the black pepper, chili powder and half the salt.",
      "Heat the coconut oil in a wide pan over high heat; sear the chicken 4–5 minutes until cooked and charred at the edges. Set aside.",
      "In the same pan fry the onion, pepper and garlic for 3 minutes, then the tomato for 3 minutes into a rough masala.",
      "Add the idiyappam strands and the grated coconut; toss and chop together with two spatulas for 2–3 minutes, kothu-style, until the strands are coated and steaming.",
      "Push to one side, scramble the beaten eggs in the cleared space for 1 minute, then fold everything together with the chicken for a final minute.",
      "Serve piled in bowls, hot off the pan.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-chemmeen-mutta-thoran",
    name: { en: "Chemmeen Mutta Thoran (Prawn & Egg Thoran)", hindi: "चेम्मीन मुट्टा थोरन" },
    category: "breakfast",
    servings: 2,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-175179", grams: 180 }, // shrimp
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-170169", grams: 50 }, // coconut meat
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Clean and devein the prawns; toss with the turmeric and half the salt and rest 10 minutes.",
      "Crush the grated coconut with the garlic and green chilli to a coarse, dry mixture — the thoran's crumb.",
      "Heat the coconut oil in a wide pan; crackle the mustard seeds, then fry the onion for 3–4 minutes until soft and golden at the edges.",
      "Add the prawns in a single layer; sear 2 minutes per side until pink, curled and just cooked through.",
      "Beat the eggs and pour over; let them set for 30 seconds, then scramble gently through the prawns for 1–2 minutes until softly set in ribbons.",
      "Scatter the coconut crumb over everything; toss for 1 minute until the thoran is dry, fragrant and the coconut clings to the egg and prawns.",
      "Serve at once with puttu, appam or rice.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-chakka-puzhukku-eggs",
    name: { en: "Chakka Puzhukku with Boiled Eggs", hindi: "चक्का पुझुक्कु अंडों के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "kerala",
    lines: [
      { foodId: "usda-174687", grams: 340 }, // jackfruit, raw (unripe)
      { foodId: "usda-171287", grams: 400 }, // egg
      { foodId: "usda-170169", grams: 40 }, // coconut meat
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170929", grams: 2 }, // mustard seed
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-330458", grams: 12 }, // coconut oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Use firm, unripe jackfruit: cut the flesh into small pieces, discarding the core. Boil the eggs for 9 minutes; cool in cold water, peel and halve.",
      "Cook the jackfruit in salted water with the turmeric for 15–18 minutes until completely tender and mashable; drain, keeping a little of the cooking water.",
      "Crush the grated coconut with the garlic and green chilli to a coarse paste.",
      "Mash the hot jackfruit roughly with a wooden spoon — a puzhukku is chunky, never a purée — and fold in the coconut paste with a splash of the cooking water; simmer 3 minutes and season.",
      "Heat the coconut oil in a small pan; crackle the mustard seeds and fry the sliced onion until golden; pour the tempering over the puzhukku.",
      "Serve the puzhukku in bowls with the halved boiled eggs alongside, yolks still deep gold.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  /* --------------------- International breakfasts --------------------- */
  {
    id: "dish-pw2-chicken-silog",
    name: { en: "Chicken Silog (Garlic Rice, Chicken & Egg)", hindi: "चिकन सिलॉग" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 220 }, // chicken breast
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-2512381", grams: 120 }, // white rice
      { foodId: "usda-1104647", grams: 16 }, // garlic
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173469", grams: 10 }, // apple cider vinegar
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cook the rice in salted water until just tender (about 12 minutes); spread on a tray to steam dry — silog rice fries best when dry, ideally cooked the day before.",
      "Pound the chicken breasts to an even 1.5 cm; season with the salt and black pepper and rest 10 minutes.",
      "Heat half the oil in a wide pan over medium-high heat; sear the chicken 4–5 minutes per side until golden and cooked through (74°C inside). Rest 5 minutes, then slice.",
      "In the same pan add the remaining oil and fry most of the garlic for 1–2 minutes until pale gold and crisp; scoop out half as a garnish.",
      "Add the rice to the garlicky oil; toss and fry 4–5 minutes until the grains are glossy, separate and flecked with garlic. Splash with half the vinegar and toss once more.",
      "Fry the eggs in a clean non-stick pan for 2–3 minutes until the whites are set and lacy at the edges and the yolks still run.",
      "Plate the garlic rice with the sliced chicken, a fried egg on top, tomato wedges alongside and the reserved crisp garlic scattered over.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-turkey-chorizo-eggs",
    name: { en: "Turkey Chorizo & Eggs (Huevos con Chorizo-Style)", hindi: "टर्की चोरिज़ो और अंडे" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 240 }, // ground turkey
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170108", grams: 80 }, // red sweet pepper
      { foodId: "usda-171319", grams: 4 }, // chili powder
      { foodId: "usda-170932", grams: 2 }, // cayenne pepper
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173469", grams: 10 }, // apple cider vinegar
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Season the ground turkey like chorizo: mix in the chili powder, cayenne, garlic, vinegar and salt and rest 15 minutes (overnight is better) so the spices bloom into the meat.",
      "Heat the oil in a heavy pan over medium-high heat; crumble in the turkey and fry 6–8 minutes, breaking it fine, until browned in spots and cooked through — it should sizzle in its own spiced fat.",
      "Add the onion and red pepper; fry 4 minutes until softened and sweet.",
      "Beat the eggs and pour over the meat; let them set for 30 seconds, then fold gently for 1–2 minutes until softly scrambled through the chorizo — glossy curds, never dry.",
      "Rest off the heat for 1 minute so the eggs finish in the pan's warmth.",
      "Serve straight from the pan, with warm flatbread or rice if you like.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-cottage-blintzes",
    name: { en: "Savoury Cottage Cheese Blintzes", hindi: "कॉटेज चीज़ ब्लिंट्ज़" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 90 }, // white flour
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-322559", grams: 120 }, // nonfat milk
      { foodId: "usda-328841", grams: 340 }, // cottage cheese
      { foodId: "usda-329370", grams: 30 }, // mozzarella
      { foodId: "usda-173410", grams: 12 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the crepe batter: whisk the flour with the milk, half the eggs and a pinch of salt into a thin, lump-free batter; rest 20 minutes.",
      "For the filling, press the cottage cheese in a cloth for 10 minutes to drain; mix with the remaining beaten egg, the grated mozzarella and a pinch of salt until it holds together.",
      "Heat a non-stick pan over medium heat, brush with a little butter, and swirl in a thin ladle of batter; cook 1–2 minutes until the top looks dry and the edges lift, then slide out — blintz crepes cook on one side only. Repeat to make 6–8 crepes.",
      "Place 2 tablespoons of filling along the lower third of each crepe (cooked side up); fold in the sides and roll into a neat parcel.",
      "Melt the remaining butter in the pan over medium heat; fry the parcels seam-side down first for 2 minutes, then turn and fry 2 minutes more until golden and the filling is hot and just set.",
      "Serve warm, two or three to a plate.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-chicken-egg-drop-soup",
    name: { en: "Chicken & Egg Drop Soup", hindi: "चिकन अंडा ड्रॉप सूप" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 200 }, // chicken breast
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2710826", grams: 100 }, // sweet corn
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-169714", grams: 16 }, // rice flour
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Poach the chicken: simmer it gently in 800 ml salted water with the ginger slices for 12–14 minutes until just cooked through; lift out, shred finely, and keep the broth.",
      "Return the broth to a gentle boil; stir in the corn and finely chopped onion and simmer 3 minutes.",
      "Stir the rice flour into 60 ml cold water to a slurry; drizzle it into the soup, stirring, and simmer 1 minute until the broth turns silky and just coats a spoon.",
      "Add the shredded chicken back; season with the salt and black pepper and bring back to the barest simmer — a rolling boil shreds the egg clouds.",
      "Beat the eggs; swirl the soup in one direction and pour the eggs in a thin stream. Wait 10 seconds, then stir once, gently — the eggs should bloom into soft ribbons.",
      "Finish with the sesame oil off the heat and serve at once in warm bowls.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-xoi-xeo",
    name: { en: "Xôi Xéo-Style Sticky Rice with Mung Bean", hindi: "चिपचिपा चावल मूंग दाल के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174256", grams: 150 }, // mung beans, dry
      { foodId: "usda-2512381", grams: 90 }, // white rice
      { foodId: "usda-172430", grams: 44 }, // peanuts
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the mung beans for 4 hours; drain and steam (or simmer in just enough water) for 18–20 minutes until completely soft. Mash half of them with the turmeric and a pinch of salt into a golden paste; keep the rest whole.",
      "Cook the rice with the whole mung beans stirred through, in salted water, for about 14 minutes until tender and sticky; rest covered 10 minutes so the grains turn glossy and cling together.",
      "Meanwhile slice the onion very thin and fry it in the oil over medium heat for 6–8 minutes, stirring often, until deep golden and crisp; drain on paper. Keep the fragrant oil.",
      "Toast the peanuts in a dry pan for 3–4 minutes until blistered; rub off the skins and crush coarsely.",
      "Fold the golden mung paste through the hot rice in ribbons — xôi xéo is marbled, not uniform.",
      "Serve in bowls with the crisp onions, their oil and the crushed peanuts over the top.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-tortang-talong",
    name: { en: "Tortang Talong-Style (Eggplant Omelette with Turkey)", hindi: "बैंगन ऑमलेट टर्की के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 360 }, // eggplant
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2514747", grams: 220 }, // ground turkey
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Char the whole eggplants over an open flame (or under a fierce grill) for 8–10 minutes, turning, until blackened and completely soft; rest in a covered bowl 10 minutes, then peel, keeping the stems on. Flatten each gently with a fork into a fan.",
      "Meanwhile fry the ground turkey with the onion, garlic and tomato in half the oil for 6–7 minutes until cooked through and the tomato melts in; season with the salt and black pepper. Keep warm.",
      "Beat the eggs with a pinch of salt in a wide shallow dish; lay a flattened eggplant in the egg and turn to coat thickly.",
      "Heat the remaining oil in a non-stick pan over medium heat; slide in the eggplant with its egg coat and spoon a quarter of the turkey mixture over the top.",
      "Cook 2–3 minutes until the underside is golden and set; flip carefully with a wide spatula and cook 2 minutes more, until the egg is cooked through and the filling hot.",
      "Repeat for the second eggplant and serve at once with rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-okonomiyaki",
    name: { en: "Okonomiyaki-Style Chicken & Cabbage Pancakes", hindi: "ओकोनोमियाकी चिकन पैनकेक" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346407", grams: 240 }, // cabbage
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-168936", grams: 90 }, // white flour
      { foodId: "usda-2646170", grams: 140 }, // chicken breast
      { foodId: "usda-322559", grams: 60 }, // nonfat milk
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Shred the cabbage finely. Whisk the flour with the milk, eggs, ginger and salt into a batter; fold in the cabbage until every strand is coated — the mixture should look like mostly cabbage held together by batter.",
      "Cut the chicken into thin small slices; season with a pinch of salt.",
      "Heat half the oil in a non-stick pan over medium heat; spread half the cabbage batter into a thick 16 cm pancake and lay half the chicken slices over the top.",
      "Cover and cook 4–5 minutes until the base is deep golden and the pancake holds together; flip with confidence and cook 4 minutes more, until the chicken is cooked through and the centre is set, not wet.",
      "Repeat for the second pancake with the remaining oil and batter.",
      "Stir the chili powder into the Greek yogurt and drizzle over the hot pancakes in a lattice; serve at once, cut in wedges.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-strammer-max",
    name: { en: "Strammer Max-Style (Turkey & Egg on Rye)", hindi: "टर्की अंडा राई टोस्ट" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 220 }, // turkey breast (raw)
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-168886", grams: 90 }, // rye flour
      { foodId: "usda-173410", grams: 12 }, // butter
      { foodId: "usda-2346406", grams: 80 }, // cucumber
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Bake the rye bread first: mix the rye flour with a pinch of salt and about 55 ml warm water into a stiff dough; shape a small flat loaf and bake at 200°C for 25–30 minutes until firm and dark. Cool and cut 2 thick slices.",
      "Slice the turkey breast into 4 thin cutlets; season with the salt and black pepper.",
      "Melt half the butter in a heavy pan over medium-high heat; sear the turkey cutlets 3 minutes per side until golden and cooked through (74°C). Rest 3 minutes.",
      "Toast the rye slices in the turkey pan juices for 1 minute per side.",
      "Fry the eggs in the remaining butter for 2–3 minutes until the whites are set with crisp edges and the yolks still run.",
      "Build each Strammer Max: rye toast, two turkey cutlets, a fried egg on top; cucumber and tomato alongside, with an extra grind of black pepper over the yolk.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven", "mixer_grinder"],
  },
  {
    id: "dish-pw2-syrniki",
    name: { en: "Syrniki (Cottage Cheese Pancakes)", hindi: "सिरनिकी कॉटेज चीज़ पैनकेक" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-328841", grams: 460 }, // cottage cheese
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-168936", grams: 70 }, // white flour
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-322559", grams: 40 }, // nonfat milk
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Drain the cottage cheese in a cloth for 15 minutes, pressing firmly — dry curds are the whole secret of syrniki that hold their shape. Push through a sieve for a smooth crumb if you like.",
      "Mix the drained cheese with the egg, milk, salt and most of the flour until a soft, just-holding dough forms; rest 10 minutes.",
      "With floured hands, shape 8 plump patties about 2 cm thick; dust lightly with the remaining flour.",
      "Heat the oil in a non-stick pan over medium heat; fry the syrniki 3–4 minutes per side until deep golden with a crisp crust.",
      "Lower the heat, cover and give them 2 more minutes so the centres set through — they should feel springy, not soft, when pressed.",
      "Serve warm with the Greek yogurt spooned over.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-tamago-sando",
    name: { en: "Tamago Sando-Style (Japanese Egg Salad Sandwich)", hindi: "अंडा सलाद सैंडविच" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // egg
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt
      { foodId: "usda-168893", grams: 110 }, // whole wheat flour
      { foodId: "usda-322559", grams: 60 }, // nonfat milk
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-170929", grams: 2 }, // mustard seed, ground
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Bake the milk bread first: knead the flour with the milk, half the salt and a pinch of the butter into a soft dough; rest 20 minutes, shape a small loaf and bake at 190°C for 20–22 minutes until pale gold. Cool fully, then cut 4 thick, soft slices.",
      "Boil the eggs for 9 minutes; cool in cold water and peel. The yolks should be deep gold and just set.",
      "Separate the yolks and mash them with the Greek yogurt, ground mustard seed, black pepper and remaining salt into a smooth, seasoned cream.",
      "Chop the whites into small cubes and fold through the yolk cream — tamago sando filling is chunky-creamy, never a purée. Chill 10 minutes.",
      "Spread the remaining butter thinly on the bread slices; pile the egg salad thickly onto two slices and cap with the others, pressing gently.",
      "Trim the crusts, cut each sandwich diagonally, and serve with the cut faces showing the gold-and-white filling.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven", "fridge"],
  },
  {
    id: "dish-pw2-gozleme",
    name: { en: "Gözleme-Style Spinach & Cheese Flatbreads", hindi: "पालक चीज़ गोज़लेमे" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 130 }, // white flour
      { foodId: "usda-328841", grams: 280 }, // cottage cheese
      { foodId: "usda-329370", grams: 60 }, // mozzarella
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with half the salt and about 75 ml warm water into a smooth dough; rest 30 minutes — gözleme dough must relax to roll paper-thin.",
      "Wilt the spinach in a dry pan for 2 minutes; squeeze bone-dry in a cloth and chop. Mix with the drained cottage cheese, grated mozzarella, finely chopped onion and remaining salt.",
      "Divide the dough into 4; roll each piece into a thin 22 cm round, almost translucent at the edges.",
      "Spread a quarter of the filling over one half of each round; fold over and seal the edges firmly with a fork.",
      "Cook on a dry hot tawa or heavy pan for 2–3 minutes per side until blistered and golden in patches, brushing with a little of the oil as they finish.",
      "Rest 2 minutes — the cheese settles — then cut in wedges and serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-mamaliga",
    name: { en: "Mămăligă-Style Cornmeal with Cottage Cheese", hindi: "मकई दलिया कॉटेज चीज़ के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 150 }, // cornmeal
      { foodId: "usda-328841", grams: 320 }, // cottage cheese
      { foodId: "usda-329370", grams: 40 }, // mozzarella
      { foodId: "usda-322892", grams: 80 }, // whole milk
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Bring 600 ml water with the salt to a boil in a heavy pot; rain in the cornmeal in a thin stream, whisking constantly so no lumps form.",
      "Lower the heat to the barest simmer; cook 20–25 minutes, stirring with a wooden spoon every few minutes and scraping the base — mămăligă is done when it pulls cleanly from the sides and holds a spoon upright.",
      "Stir in the butter and milk until glossy.",
      "Drain the cottage cheese lightly and crumble it in large curds; grate the mozzarella.",
      "Layer in warm bowls: a bed of mămăligă, a generous crumble of cottage cheese, more mămăligă, and the mozzarella over the top.",
      "Cover each bowl for 2 minutes so the cheeses soften into the hot cornmeal; serve with a spoon, pulling up long cheesy strands.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-buckwheat-galette",
    name: { en: "Buckwheat Galette with Egg & Cheese (Galette Complète-Style)", hindi: "कुट्टू गैलेट अंडा चीज़ के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512378", grams: 130 }, // whole buckwheat
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-329370", grams: 70 }, // mozzarella
      { foodId: "usda-322559", grams: 80 }, // nonfat milk
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Grind the whole buckwheat to a coarse flour in a blender. Whisk with the milk, 150 ml water, a third of the eggs (beaten in) and the salt into a thin batter; rest at least 1 hour — buckwheat batter must hydrate or the galettes tear.",
      "Heat a large non-stick pan or crepe pan over medium-high heat and wipe with a little butter.",
      "Ladle in batter and swirl into a thin 24 cm galette; cook 1–2 minutes until the edges crisp and lace and the surface looks dry.",
      "Scatter a quarter of the grated mozzarella over the centre, add a handful of spinach to wilt in the steam, then crack an egg into the middle.",
      "Fold the four edges in to frame the yolk in a square; cover and cook 2–3 minutes until the white is just set and the yolk still glistens.",
      "Slide onto a warm plate and repeat for the remaining galettes; serve at once.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-croque-madame",
    name: { en: "Croque Madame-Style (Turkey, Cheese & Egg Sandwich)", hindi: "क्रोक मैडम सैंडविच" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171098", grams: 200 }, // turkey breast (raw)
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-329370", grams: 60 }, // mozzarella
      { foodId: "usda-168893", grams: 110 }, // whole wheat flour
      { foodId: "usda-322559", grams: 100 }, // nonfat milk
      { foodId: "usda-173410", grams: 12 }, // butter
      { foodId: "usda-170929", grams: 2 }, // mustard seed, ground
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Bake the bread first: knead 100 g of the flour with half the salt and about 65 ml warm water into a soft dough; rest 15 minutes, shape a small loaf and bake at 200°C for 22–25 minutes. Cool and cut 4 slices.",
      "Slice the turkey into 4 thin cutlets; sear in half the butter for 3 minutes per side until golden and cooked through.",
      "Make the béchamel: melt the remaining butter, whisk in the remaining flour for 1 minute, then the milk a splash at a time, simmering 3 minutes into a thick sauce; season with the ground mustard seed and remaining salt, and stir in half the grated mozzarella.",
      "Toast the bread slices lightly; spread each with béchamel, layer turkey and the remaining mozzarella, and cap to make 2 sandwiches.",
      "Spoon more béchamel over the tops and grill (broil) for 3–4 minutes until bubbling and golden in patches.",
      "Fry the eggs sunny-side for 2–3 minutes and crown each sandwich with one — the madame's hat. Serve at once with a knife and fork.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-huevos-rotos",
    name: { en: "Huevos Rotos-Style (Eggs over Potatoes with Turkey)", hindi: "आलू पर अंडे टर्की के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2346401", grams: 340 }, // potatoes
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-2514747", grams: 150 }, // ground turkey
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170427", grams: 80 }, // green sweet pepper
      { foodId: "usda-171413", grams: 20 }, // olive oil
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cut the potatoes into thin rounds or small wedges; soak 10 minutes in cold water and dry thoroughly.",
      "Heat the olive oil in a wide pan over medium heat; fry the potatoes in a loose layer for 12–15 minutes, turning now and then, until tender inside and golden at the edges — confit-fried, not deep-fried. Season with half the salt and lift onto a warm serving dish.",
      "In the same pan, fry the ground turkey with the onion and pepper for 6–7 minutes, crumbling fine, until cooked through; dust with the chili powder and remaining salt and scatter over the potatoes.",
      "Wipe the pan, add a film of the remaining oil if needed, and fry the eggs over medium-low heat for 2–3 minutes until the whites are just set and the yolks still liquid — rotos eggs are never flipped.",
      "Slide the eggs over the potatoes and turkey.",
      "At the table, break (romper) the yolks with the edge of a spoon so they sauce the whole dish, and eat at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-turkey-biscuits-gravy",
    name: { en: "Turkey Sausage Gravy with Whole Wheat Biscuits", hindi: "टर्की सॉसेज ग्रेवी बिस्कुट के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 240 }, // ground turkey
      { foodId: "usda-168893", grams: 140 }, // whole wheat flour
      { foodId: "usda-322559", grams: 300 }, // nonfat milk
      { foodId: "usda-173410", grams: 16 }, // butter
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171323", grams: 2 }, // fennel seed
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Bake the biscuits: rub half the butter into 100 g of the flour with a pinch of salt until sandy; stir in 60 ml of the milk to a shaggy dough, pat out 2 cm thick, cut 4 rounds and bake at 200°C for 12–14 minutes until risen and golden.",
      "Season the ground turkey with the fennel seed (crushed), chili powder, black pepper and remaining salt — the sausage seasoning.",
      "Melt the remaining butter in a heavy pan over medium-high heat; crumble in the turkey and fry 6–8 minutes, breaking it into small crumbles, until well browned.",
      "Sprinkle the remaining flour over the meat; stir and cook 1 minute so the flour toasts in the fat.",
      "Pour in the remaining milk a little at a time, stirring constantly; simmer 3–4 minutes into a thick, peppery gravy that coats the back of a spoon. Rest 2 minutes — it thickens as it stands.",
      "Split the warm biscuits and ladle the gravy generously over; serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-turkey-loco-moco",
    name: { en: "Turkey Loco Moco-Style (Rice, Turkey Patty, Egg & Gravy)", hindi: "टर्की लोको मोको" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 260 }, // ground turkey
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-2512381", grams: 110 }, // white rice
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-1750347", grams: 100 }, // mushrooms
      { foodId: "usda-168936", grams: 20 }, // white flour
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cook the rice in salted water for about 12 minutes until tender; keep warm.",
      "Season the ground turkey with the salt and black pepper; shape 2 thick patties.",
      "Heat half the oil in a heavy pan over medium-high heat; sear the patties 4–5 minutes per side until deeply browned and cooked through (74°C). Rest on a warm plate; keep the pan juices.",
      "In the same pan, fry the onion and mushrooms in the remaining oil for 5 minutes until golden; stir in the garlic and flour and cook 1 minute.",
      "Pour in 250 ml water a splash at a time, stirring, and simmer 3 minutes into a glossy brown gravy; season to taste.",
      "Fry the eggs sunny-side for 2–3 minutes, whites set, yolks runny.",
      "Build each plate: a mound of rice, a turkey patty, gravy ladled over everything, and the fried egg on top.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-migas",
    name: { en: "Migas-Style Eggs with Tortilla Strips & Cheddar", hindi: "मिगास अंडे टॉर्टिला के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-168867", grams: 80 }, // cornmeal
      { foodId: "usda-328637", grams: 80 }, // cheddar
      { foodId: "usda-170457", grams: 100 }, // tomato
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170427", grams: 80 }, // green sweet pepper
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the tortillas: mix the cornmeal with a pinch of salt and about 55 ml warm water into a soft dough; divide into 4, roll thin and cook on a dry hot pan 1 minute per side. Cut into short strips.",
      "Heat half the oil in a wide pan over medium-high heat; fry the tortilla strips for 2–3 minutes until crisp and golden at the edges. Set aside.",
      "In the same pan, fry the onion and pepper in the remaining oil for 4 minutes; add the tomato and chili powder and cook 3 minutes until the tomato softens and the pan looks almost dry.",
      "Return the crisp strips; toss for 30 seconds so they take the heat but keep their crunch.",
      "Beat the eggs with the remaining salt and pour over; fold gently for 1–2 minutes until softly set around the strips — migas eggs stay loose and glossy.",
      "Scatter the grated cheddar over, cover for 30 seconds to melt, and serve straight from the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-cuscuz-nordestino",
    name: { en: "Cuscuz Nordestino-Style (Cornmeal Couscous with Egg & Cheese)", hindi: "मकई कुसकुस अंडा चीज़ के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 140 }, // cornmeal
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-329370", grams: 90 }, // mozzarella
      { foodId: "usda-322892", grams: 100 }, // whole milk
      { foodId: "usda-173410", grams: 10 }, // butter
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Hydrate the cornmeal: sprinkle it with the salt and about 90 ml water, mixing with your fingers until it feels like damp sand; rest 10 minutes so the grains swell.",
      "Pack the cornmeal loosely into a steamer basket (a cuscuzeira if you have one); steam over boiling water for 10–12 minutes until set, fragrant and springy — it should unmould in one soft dome.",
      "Meanwhile melt the butter and fry the tomato for 3 minutes until jammy; scramble the eggs through it softly for 2 minutes, seasoning with a pinch of salt.",
      "Warm the milk to steaming (do not boil).",
      "Unmould the cuscuz onto a warm plate; flake it open with a fork and pour the hot milk over so it turns supple and steamy.",
      "Crown with thick slices of mozzarella to melt in the heat and the tomato eggs alongside; serve at once.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-bolon-verde",
    name: { en: "Bolón de Verde-Style (Plantain & Cheese Balls)", hindi: "केला चीज़ बॉल" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2710818", grams: 400 }, // plantains
      { foodId: "usda-329370", grams: 180 }, // mozzarella
      { foodId: "usda-328841", grams: 80 }, // cottage cheese
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Peel the green plantains (cut off the ends, score the skin lengthways and lift it off under running water) and cut into 4 cm chunks.",
      "Boil the plantain in salted water for 15–18 minutes until completely tender — a knife should slide through with no resistance.",
      "Drain and mash while steaming hot with the salt, working it until smooth and dough-like; the mash stiffens as it cools, so shape it warm.",
      "Mix the grated mozzarella with the drained, crumbled cottage cheese.",
      "With oiled hands, take a ball of plantain mash, flatten it in your palm, fill the centre with the cheese mixture and close it into a smooth ball about the size of a small orange. Repeat to make 4.",
      "Brush the bolones with the oil and bake at 200°C (or fry in a lightly oiled pan) for 12–15 minutes, turning once, until golden and crisp outside and the cheese inside is molten.",
      "Rest 2 minutes — the cheese is lava-hot — and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-nasi-uduk",
    name: { en: "Nasi Uduk-Style Coconut Rice with Tempeh & Peanuts", hindi: "नारियल चावल टेम्पेह के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 110 }, // white rice
      { foodId: "usda-170172", grams: 100 }, // coconut milk
      { foodId: "usda-174272", grams: 200 }, // tempeh
      { foodId: "usda-172430", grams: 30 }, // peanuts
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cook the rice in the coconut milk topped up with water to the usual level, with the ginger, turmeric and half the salt, for about 14 minutes; rest covered 10 minutes so the grains turn glossy and fragrant.",
      "Cut the tempeh into thin fingers; toss with a pinch of salt.",
      "Heat the oil in a wide pan over medium-high heat; fry the tempeh 3–4 minutes per side until deep golden and crisp at the edges.",
      "Toast the peanuts in a dry pan for 3 minutes until blistered; crush coarsely with the sliced red chilli for a quick sambal crunch.",
      "Fluff the coconut rice and mound it on plates; arrange the tempeh alongside.",
      "Serve with cucumber slices and the peanut-chilli crunch scattered over the rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-dan-bing",
    name: { en: "Dan Bing-Style Egg & Cheese Crepe Rolls", hindi: "अंडा चीज़ क्रेप रोल" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 100 }, // white flour
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-329370", grams: 80 }, // mozzarella
      { foodId: "usda-322559", grams: 60 }, // nonfat milk
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Whisk the flour with the milk, 60 ml water and a pinch of salt into a thin crepe batter; rest 15 minutes.",
      "Beat the eggs with the remaining salt and the chopped coriander leaves.",
      "Heat a non-stick pan over medium heat with a brush of oil; swirl in a thin layer of batter and cook 1 minute until just set on top.",
      "Pour a quarter of the beaten egg over the crepe and tilt to coat; cook 30 seconds until the egg films over.",
      "Flip the whole sheet so the egg side hits the pan for 20 seconds; flip back, scatter grated mozzarella along one edge, and roll up tightly while the cheese melts.",
      "Repeat for 4 rolls; rest 1 minute, slice each roll into 4 pieces on the diagonal, and serve warm.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-khao-tom",
    name: { en: "Khao Tom-Style Shrimp & Egg Rice Soup", hindi: "झींगा अंडा चावल सूप" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 220 }, // shrimp
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-2512381", grams: 90 }, // white rice
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-2346407", grams: 60 }, // cabbage
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cook the rice in 900 ml salted water for 12–14 minutes until the grains burst and the broth turns starchy and soupy — khao tom is rice IN broth, not rice with broth.",
      "Add the ginger and shredded cabbage; simmer 3 minutes.",
      "Slide in the cleaned prawns; poach 2–3 minutes until they curl pink and are just cooked — carryover heat finishes them, so do not wait for them to toughen.",
      "Beat the eggs; swirl the soup and stream the eggs in, waiting 10 seconds before one gentle stir so they set in soft clouds.",
      "Season with the salt and black pepper; finish with the sesame oil and garlic (fried golden in the oil for 1 minute if you like it crisp).",
      "Serve in deep bowls with coriander leaves over the top.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-turkey-eggwhite-bake",
    name: { en: "Turkey, Egg-White & Cottage Cheese Bake", hindi: "टर्की अंडा-सफ़ेदी बेक" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 440 }, // ground turkey
      { foodId: "usda-172183", grams: 480 }, // egg white
      { foodId: "usda-328841", grams: 320 }, // cottage cheese
      { foodId: "usda-170108", grams: 200 }, // red sweet pepper
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-168462", grams: 160 }, // spinach
      { foodId: "usda-329370", grams: 60 }, // mozzarella
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170931", grams: 4 }, // black pepper
    ],
    method: [
      "Heat the oven to 180°C. Brown the ground turkey in a dry non-stick pan over medium-high heat for 7–8 minutes, crumbling fine, until cooked through and its liquid has cooked off; season with half the salt and black pepper.",
      "Add the onion and red pepper to the pan; cook 4 minutes until softened. Stir in the spinach and cook 1 minute until just wilted; take off the heat.",
      "Whisk the egg whites with the remaining salt until just foamy; fold in the drained cottage cheese.",
      "Tip the turkey mixture into a baking dish (about 20 × 25 cm), spread level, and pour the egg-white mixture over, nudging it into the corners.",
      "Scatter the grated mozzarella over the top.",
      "Bake for 25–30 minutes until puffed, set in the centre (a knife comes out clean) and golden at the edges.",
      "Rest 10 minutes — it slices cleanly once settled — and cut into 4 generous squares. It keeps 3 days in the fridge and reheats well.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-soboro-bowl",
    name: { en: "Soboro-Style Turkey & Egg Rice Bowl", hindi: "टर्की अंडा चावल कटोरा" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 240 }, // ground turkey
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2512381", grams: 110 }, // white rice
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-746773", grams: 60 }, // pears
      { foodId: "usda-170419", grams: 60 }, // green peas
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cook the rice in salted water for about 12 minutes until tender; keep warm.",
      "Make the soboro turkey: cook the ground turkey in a dry pan over medium heat with the finely grated pear (the classic dish's fruit sweetness) and ginger, stirring and crumbling for 6–7 minutes until the liquid cooks off and the crumbles turn glossy and lightly caramelised. Season with the salt.",
      "Scramble the eggs separately in the sesame oil over low heat, stirring constantly for 2–3 minutes into fine, soft, pale-gold crumbs — soboro eggs are crumbled small, not folded large.",
      "Warm the peas through in the rice for the last 2 minutes of its resting time.",
      "Divide the rice between bowls and level the tops.",
      "Serve with the turkey soboro over one half of the rice and the egg soboro over the other, peas scattered across the seam.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-tuna-egg-rice-bowl",
    name: { en: "Yogurt Tuna & Egg Rice Bowl", hindi: "टूना अंडा चावल कटोरा" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 240 }, // tuna (canned, drained)
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-2512381", grams: 110 }, // white rice
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt
      { foodId: "usda-2346406", grams: 100 }, // cucumber
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cook the rice in salted water for about 12 minutes until tender; rest 5 minutes and fluff.",
      "Boil the eggs for 8 minutes; cool, peel and cut into wedges — the yolks should be jammy at the centre.",
      "Drain the tuna well and flake it into a bowl; fold in the Greek yogurt, lemon juice, chili powder and a pinch of salt into a creamy, seasoned tuna salad.",
      "Dice the cucumber small and toss with a pinch of salt.",
      "Toast the sesame seeds in a dry pan for 1–2 minutes until fragrant and just golden.",
      "Build the bowls: rice first, the yogurt tuna over one side, cucumber over the other, egg wedges on top and sesame scattered over everything.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-banh-mi-sandwich",
    name: { en: "Banh Mi-Style Chicken & Egg Sandwich", hindi: "बान मी चिकन सैंडविच" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 200 }, // chicken breast
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-168936", grams: 120 }, // white flour
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-2346406", grams: 80 }, // cucumber
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-330137", grams: 60 }, // Greek yogurt
      { foodId: "usda-173469", grams: 16 }, // apple cider vinegar
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Bake the rolls: knead the flour with half the salt and about 70 ml warm water into a soft dough; rest 20 minutes, shape 2 stubby baguette rolls and bake at 220°C for 15–18 minutes until crisp-crusted and hollow-sounding. Cool.",
      "Quick-pickle the vegetables: toss the carrot (cut in fine matchsticks) and cucumber ribbons with the vinegar and a pinch of salt; rest 20 minutes, then drain.",
      "Pound the chicken to an even thickness; season with the remaining salt and sear in a dry non-stick pan for 4–5 minutes per side until golden and cooked through. Rest, then slice thickly.",
      "Fry the eggs for 2–3 minutes until the whites set and the yolks still run.",
      "Split the rolls and spread the cut sides with Greek yogurt; layer in the chicken, a fried egg, the pickled vegetables, green chilli slices and plenty of coriander leaves.",
      "Press gently, cut in half, and eat while the yolk still sauces the filling.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-khai-yat-sai",
    name: { en: "Khai Yat Sai-Style (Thai Stuffed Omelette with Turkey)", hindi: "भरवां ऑमलेट टर्की के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2514747", grams: 220 }, // ground turkey
      { foodId: "usda-170419", grams: 80 }, // green peas
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the filling: fry the ground turkey with the onion and garlic in half the oil over medium-high heat for 5–6 minutes, crumbling fine, until cooked through.",
      "Add the tomato and peas; cook 3 minutes until the tomato melts and the filling is moist but not wet. Season with the salt and black pepper; keep warm.",
      "Beat the eggs with a pinch of salt. Heat a 20 cm non-stick pan over medium heat with a little of the remaining oil, swirling to coat the sides.",
      "Pour in half the egg and swirl into a thin, even omelette sheet; cook 1–2 minutes until just set on top — no browning.",
      "Spoon half the filling into the centre; fold the four edges over into a neat square parcel, seam-side down, and slide onto a plate. Repeat for the second omelette.",
      "Serve seam-side down with coriander leaves over, and cut open at the table so the filling spills out.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-roti-telur",
    name: { en: "Roti Telur-Style Egg Flatbread", hindi: "रोटी तेलुर अंडा पराठा" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 130 }, // white flour
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-171314", grams: 14 }, // ghee
      { foodId: "usda-322559", grams: 40 }, // nonfat milk
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with half the salt and about 75 ml warm water into a soft dough; divide into 4 balls, coat lightly with a little of the ghee and rest 30 minutes — rested dough stretches thin without tearing.",
      "Beat the eggs with the milk, remaining salt, finely chopped onion and green chilli.",
      "Stretch or roll each dough ball into a thin 20 cm round (roti canai is thrown; a rolling pin is honest too).",
      "Heat a tawa over medium heat with a brush of ghee; lay on a round and pour a quarter of the egg mixture over it, tilting to spread.",
      "Cook 2 minutes until the egg sets into the bread; fold the edges in to a square, flip, and cook 1–2 minutes more in a little more ghee until golden and puffed in layers.",
      "Repeat for the remaining rotis; serve hot, torn and shared.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-kuku-sabzi",
    name: { en: "Kuku Sabzi-Style Herb & Walnut Egg Bake", hindi: "हर्ब अखरोट अंडा बेक" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-172183", grams: 160 }, // egg white
      { foodId: "usda-168462", grams: 200 }, // spinach
      { foodId: "usda-169997", grams: 60 }, // coriander leaves
      { foodId: "usda-168416", grams: 40 }, // drumstick (moringa) leaves
      { foodId: "usda-2346394", grams: 50 }, // walnuts
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173475", grams: 20 }, // spearmint leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Wash the spinach, coriander, moringa leaves and mint; dry very well and chop finely — kuku sabzi is more herb than egg, and wet herbs steam instead of frying.",
      "Whisk the eggs with the egg whites, turmeric and salt until evenly combined; fold in all the chopped greens and the finely sliced onion until the mixture is dark green throughout.",
      "Stir in the coarsely chopped walnuts.",
      "Heat the oil in a 22 cm non-stick pan over medium heat until shimmering; pour in the mixture and level the top.",
      "Cover and cook on low heat for 10–12 minutes until the edges are set and the centre is nearly firm.",
      "Flip in one piece (slide onto a plate and invert back) and cook 4–5 minutes more, until deep green-gold and set through.",
      "Rest 5 minutes; cut into wedges. Serve warm or at room temperature — kuku keeps its flavour cold.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-tofu-peanut-congee",
    name: { en: "Tofu & Peanut Congee", hindi: "टोफू मूंगफली कांजी" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 110 }, // white rice
      { foodId: "usda-172448", grams: 380 }, // tofu
      { foodId: "usda-172430", grams: 70 }, // peanuts
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-790646", grams: 30 }, // onion
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Simmer the rice in 1 litre of salted water for 30–35 minutes, stirring now and then, until the grains burst and the congee turns thick and porridge-like; add water if it tightens too much.",
      "Stir in the ginger (cut in fine matchsticks) and the finely chopped onion for the last 10 minutes.",
      "Toast the peanuts in a dry pan for 3–4 minutes until blistered; crush half coarsely and leave half whole.",
      "Cut the tofu into 2 cm cubes; slide them into the congee for the last 5 minutes to heat through without breaking.",
      "Wilt the spinach through the hot congee for 1 minute; season with the salt and plenty of black pepper.",
      "Serve in deep bowls with the sesame oil drizzled over and both the crushed and whole peanuts scattered on top.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-grechka-tofu",
    name: { en: "Grechka-Style Buckwheat with Tofu & Mushrooms", hindi: "कुट्टू टोफू मशरूम के साथ" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512378", grams: 150 }, // whole buckwheat
      { foodId: "usda-172448", grams: 380 }, // tofu
      { foodId: "usda-1750347", grams: 160 }, // mushrooms
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Toast the buckwheat groats in a dry pot for 3–4 minutes until nutty and a shade darker; add 300 ml salted water, cover and simmer 15 minutes. Rest off the heat for 10 minutes, then fluff — grechka grains stay separate and distinct.",
      "Press the tofu between cloths for 10 minutes to dry its surface; cut into 2 cm cubes and toss with a pinch of salt and the black pepper.",
      "Heat half the oil in a wide pan over high heat; sear the tofu in a single layer for 6–8 minutes, turning, until golden on most faces. Set aside.",
      "In the same pan, fry the onion and mushrooms in the remaining oil for 6–7 minutes until the mushrooms give up their water and brown; add the garlic for the last minute.",
      "Fold the tofu and the mushroom mixture through the hot buckwheat; rest covered 3 minutes so the flavours marry.",
      "Serve in bowls, steaming, with extra black pepper.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  /* ------------------------------ Snacks ------------------------------ */
  {
    id: "dish-pw2-baked-fish-fingers",
    name: { en: "Baked Fish Fingers (Cod)", hindi: "बेक्ड फिश फिंगर्स" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 300 }, // cod
      { foodId: "usda-174288", grams: 50 }, // besan (chickpea flour)
      { foodId: "usda-172183", grams: 60 }, // egg white
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Heat the oven to 210°C. Cut the cod into finger-size strips about 2 cm thick; pat completely dry and season with the salt, turmeric and chili powder.",
      "Set up a coating line: the besan in one shallow dish, the beaten egg white in another.",
      "Roll each fish finger in besan, then in egg white, then in besan again — the double flour coat is what crisps in the oven instead of a crumb.",
      "Lay the fingers on an oiled rack over a tray, not touching; brush or spray the tops with the oil.",
      "Bake for 12–14 minutes, turning once halfway, until the crust is deep golden and crisp and the fish flakes at the thickest point.",
      "Rest 2 minutes (the crust sets) and serve with lemon wedges to squeeze over.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["oven"],
  },
  {
    id: "dish-pw2-shrimp-cakes",
    name: { en: "Thai-Style Shrimp Cakes", hindi: "झींगा केक थाई शैली" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 280 }, // shrimp
      { foodId: "usda-2346400", grams: 80 }, // green beans
      { foodId: "usda-169714", grams: 30 }, // rice flour
      { foodId: "usda-172183", grams: 50 }, // egg white
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Blitz half the prawns to a sticky paste in a food processor (or pound them) — the paste is the glue. Chop the rest coarsely for texture.",
      "Mix both prawn preparations with the rice flour, egg white, finely chopped green beans, garlic, red chilli, coriander leaves and salt until evenly combined; chill 15 minutes to firm up.",
      "With wet hands, shape 8 small patties about 1.5 cm thick.",
      "Heat the oil in a non-stick pan over medium heat; fry the cakes 3 minutes per side until deep golden, springy and cooked through — a prawn cake should bounce back when pressed.",
      "Drain on paper for 1 minute.",
      "Serve hot, straight off the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-pw2-soya-bean-kebabs",
    name: { en: "Soya Bean Kebabs", hindi: "सोया बीन कबाब" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 140 }, // soybeans, dry
      { foodId: "usda-174288", grams: 40 }, // besan (chickpea flour)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the soybeans overnight; boil in fresh water for 35–40 minutes until completely tender. Drain very well and spread on a tray to steam dry for 10 minutes — a dry mash makes kebabs that hold.",
      "Mash the beans coarsely (a food processor in pulses, or a masher) — keep some texture, never a purée.",
      "Mix in the besan, finely chopped onion, ginger, green chilli, coriander leaves, cumin, chili powder and salt; rest 10 minutes so the besan drinks the moisture.",
      "Shape 8 patties with oiled hands, about 1.5 cm thick.",
      "Heat the oil in a heavy pan over medium heat; fry the kebabs 4 minutes per side until deep golden with a crisp crust and hot through the centre.",
      "Serve hot, straight off the pan.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-rajma-kebabs",
    name: { en: "Rajma Kebabs", hindi: "राजमा कबाब" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-175193", grams: 170 }, // kidney beans, dry
      { foodId: "usda-174288", grams: 50 }, // besan (chickpea flour)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the kidney beans overnight; boil in fresh water for 40–45 minutes until completely soft. Drain very well and steam dry on a tray for 10 minutes.",
      "Toast the besan in a dry pan for 2–3 minutes until it smells nutty — roasted besan binds without tasting raw.",
      "Mash the beans coarsely, keeping some whole pieces for texture.",
      "Mix in the roasted besan, finely chopped onion, ginger, garlic, cumin, chili powder, coriander leaves and salt; rest 10 minutes.",
      "Shape 8 patties with oiled hands.",
      "Fry in the oil over medium heat for 4 minutes per side until deeply golden and crisp-crusted; serve hot.",
    ],
    timeMinutes: 50,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-masala-vada-patties",
    name: { en: "Masala Vada-Style Dal Patties", hindi: "मसाला वड़ा पैटी" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174284", grams: 190 }, // red lentils, dry
      { foodId: "usda-174288", grams: 30 }, // besan (chickpea flour)
      { foodId: "usda-790646", grams: 70 }, // onion
      { foodId: "usda-171323", grams: 2 }, // fennel seed
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the red lentils for 2 hours; drain very well — masala vada batter is ground almost dry, with just the soaking moisture.",
      "Grind the lentils coarsely with no added water (a few pulses, scraping down) — the batter should be gritty and hold a shape, never pourable.",
      "Fold in the besan, finely chopped onion, crushed fennel seed, green chilli, ginger and salt.",
      "With wet hands, shape 10 small patties about 1 cm thick.",
      "Shallow-fry in the oil over medium heat for 3–4 minutes per side until deep amber and crisp all over — pan-fried, not deep-fried, and just as crunchy at the edges.",
      "Drain on paper and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-masala-edamame-chaat",
    name: { en: "Masala Edamame Chaat", hindi: "मसाला एडामामे चाट" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168410", grams: 340 }, // edamame (frozen, shelled)
      { foodId: "usda-172430", grams: 50 }, // peanuts
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Boil the edamame in salted water for 3–4 minutes until bright green and just tender; drain and let the surface steam dry.",
      "Toast the peanuts in a dry pan for 3 minutes until blistered; rub off the skins and crush coarsely.",
      "Toast the cumin seeds in the same dry pan for 1 minute until fragrant; crush and mix with the chili powder and salt for the chaat masala.",
      "Toss the warm edamame with the finely chopped onion and tomato, the chaat masala and a generous squeeze of lemon juice.",
      "Fold through the crushed peanuts and coriander leaves at the last moment so the crunch survives.",
      "Serve warm or at room temperature, in small bowls with spoons.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-devilled-eggs",
    name: { en: "Yogurt Devilled Eggs", hindi: "दही डेविल्ड अंडे" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 400 }, // egg
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt
      { foodId: "usda-170929", grams: 4 }, // mustard seed, ground
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Boil the eggs for 10 minutes; cool in cold water so the whites stay unblemished, and peel carefully.",
      "Halve the eggs lengthways and pop the yolks into a bowl.",
      "Mash the yolks with the Greek yogurt, ground mustard seed, turmeric, salt and black pepper until completely smooth and pipeable — this is the mayonnaise-free devilled filling.",
      "Spoon or pipe the filling back into the white halves in generous mounds.",
      "Finish with finely chopped coriander leaves and an extra crack of black pepper.",
      "Chill 15 minutes so the filling firms, and serve cold.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pw2-salmon-crepe-rolls",
    name: { en: "Salmon & Cottage Cheese Egg-Crepe Rolls", hindi: "सैल्मन अंडा क्रेप रोल" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 200 }, // salmon
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-328841", grams: 120 }, // cottage cheese
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173410", grams: 8 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Poach the salmon in barely simmering salted water for 7–8 minutes until just cooked; cool and flake, checking for bones.",
      "Mix the flaked salmon with the drained cottage cheese, lemon juice, black pepper and a pinch of salt; fold in the finely shredded spinach.",
      "Beat the eggs with the remaining salt; melt a little butter in a non-stick pan and make 2 thin egg crepes — a ladle of egg swirled thin, 1 minute, no flipping, sliding out while still supple.",
      "Lay the crepes flat; spread the salmon mixture along the lower third of each.",
      "Roll up tightly, tucking the sides in as you go, like a wrap.",
      "Rest seam-side down for 2 minutes, then slice each roll into 4 pieces and serve at room temperature.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-tofu-satay",
    name: { en: "Tofu Satay Skewers with Peanut Sauce", hindi: "टोफू साते मूंगफली सॉस के साथ" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 360 }, // tofu
      { foodId: "usda-172430", grams: 80 }, // peanuts
      { foodId: "usda-170172", grams: 60 }, // coconut milk
      { foodId: "usda-167763", grams: 16 }, // tamarind pulp
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Press the tofu between cloths for 15 minutes; cut into 3 cm cubes and toss with the turmeric, half the salt and a little of the oil. Thread onto soaked skewers.",
      "Make the satay sauce: pound or blend the peanuts to a coarse paste; simmer with the coconut milk, tamarind pulp (soaked in 60 ml warm water and strained), garlic, red chilli and remaining salt for 4–5 minutes until thick and glossy, stirring so it does not catch.",
      "Grill or pan-sear the tofu skewers over medium-high heat for 8–10 minutes, turning every couple of minutes, until charred at the edges and firm.",
      "Brush the skewers with a little of the sauce for the last 2 minutes so it lacquers on.",
      "Rest the skewers for 2 minutes so the lacquer sets.",
      "Serve hot with the remaining warm peanut sauce for dipping.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-white-bean-dip-eggs",
    name: { en: "White Bean & Herb Dip with Boiled Eggs", hindi: "सफ़ेद बीन डिप अंडों के साथ" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-173745", grams: 150 }, // navy beans, dry
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-171413", grams: 16 }, // olive oil
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the navy beans overnight; boil in fresh water for 35–40 minutes until completely soft. Reserve a cup of the cooking water. Boil the eggs for 9 minutes; cool, peel and halve.",
      "Blend the hot beans with the garlic, cumin, lemon juice, salt and half the olive oil, adding cooking water a splash at a time, until smooth and scoopable — it thickens as it cools, so keep it a touch loose.",
      "Fold in the chopped coriander leaves.",
      "Spoon the warm dip into a shallow bowl; swirl the top and drizzle with the remaining olive oil.",
      "Arrange the halved eggs around the dip.",
      "Serve with flatbread or vegetable sticks for scooping.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-chicken-reshmi-kebabs",
    name: { en: "Chicken Reshmi Kebabs", hindi: "चिकन रेशमी कबाब" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2646170", grams: 260 }, // chicken breast
      { foodId: "usda-330137", grams: 80 }, // Greek yogurt
      { foodId: "usda-328841", grams: 60 }, // cottage cheese
      { foodId: "usda-169231", grams: 8 }, // ginger
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cut the chicken into 4 cm pieces. Blend the drained cottage cheese with the Greek yogurt, ginger, garlic, green chilli, coriander leaves and salt into a smooth, thick marinade — reshmi means silky, and this marinade is why.",
      "Coat the chicken thoroughly and marinate at least 1 hour (overnight is best).",
      "Thread the chicken onto skewers, letting the excess marinade cling.",
      "Grill over high heat (or sear in a smoking-hot pan with the oil) for 8–10 minutes, turning every 2 minutes, until charred at the edges and cooked through (74°C) — the yogurt marinade browns fast, so keep them moving.",
      "Rest 3 minutes under foil so the juices settle back in.",
      "Serve hot, soft and silky, straight off the skewers.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "mixer_grinder"],
  },
  {
    id: "dish-pw2-chicken-kathi-roll",
    name: { en: "Chicken Kathi Roll", hindi: "चिकन काठी रोल" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 110 }, // white flour
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-2646170", grams: 200 }, // chicken breast
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170427", grams: 60 }, // green sweet pepper
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with half the salt and about 65 ml warm water into a soft dough; rest 20 minutes, then roll 2 thin parathas and cook on a tawa with a little of the oil, 1–2 minutes per side, until puffed and golden. Keep warm.",
      "Cut the chicken into thin strips; toss with the chili powder, cumin and remaining salt.",
      "Heat the remaining oil in a wide pan over high heat; sear the chicken 5–6 minutes until charred at the edges and cooked through. Add the onion and pepper for the last 3 minutes so they soften but keep their bite.",
      "Beat the eggs; in a clean pan, make 2 thin omelette sheets, 1 minute each, no browning.",
      "Lay an omelette sheet on each paratha; pile the chicken mixture down the centre and squeeze lemon juice over.",
      "Roll up tightly, wrap the base in paper, and eat hot.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-martabak-telur",
    name: { en: "Martabak Telur-Style (Egg & Turkey Pastry)", hindi: "मर्तबाक तेलुर" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 90 }, // white flour
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-2514747", grams: 180 }, // ground turkey
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170924", grams: 2 }, // curry powder
      { foodId: "usda-171025", grams: 16 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with half the salt and about 55 ml warm water into a soft dough; divide into 2 balls, coat with a little oil and rest 30 minutes — martabak skin must stretch without snapping back.",
      "Cook the filling: fry the ground turkey with half the onion and the curry powder in a dry pan for 5–6 minutes until cooked through and dry; season and cool slightly.",
      "Beat the eggs with the remaining onion, green chilli and salt; stir in the warm turkey mixture.",
      "Stretch each dough ball on an oiled surface into a large, thin, almost translucent sheet (hands, not a pin, if you can).",
      "Heat the remaining oil in a wide pan over medium heat; lay in a sheet, spoon half the egg-turkey filling into the centre and fold the edges in to a square parcel.",
      "Fry 3 minutes per side, pressing gently, until crisp, golden and the egg inside is set. Repeat for the second parcel.",
      "Cut into squares and serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-roti-john",
    name: { en: "Roti John-Style Chicken & Egg Sandwich", hindi: "रोटी जॉन सैंडविच" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 180 }, // chicken breast
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-168936", grams: 110 }, // white flour
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170457", grams: 60 }, // tomato
      { foodId: "usda-170427", grams: 50 }, // green sweet pepper
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Bake the loaf first: knead the flour with half the salt and about 65 ml warm water into a soft dough; rest 15 minutes, shape a stubby loaf and bake at 200°C for 20–22 minutes. Cool, then split lengthways into 2 long halves.",
      "Mince the chicken finely; fry it in half the oil with the onion, pepper, chili powder and remaining salt for 5–6 minutes until cooked through and lightly browned. Cool 2 minutes.",
      "Beat the eggs and stir the chicken mixture through them.",
      "Heat the remaining oil in a wide pan over medium heat; pour in the egg-chicken mixture in 2 long ovals roughly the shape of the bread.",
      "While the egg is still wet on top, press the cut side of each bread half firmly onto it; cook 2 minutes until the egg sets onto the bread.",
      "Flip the whole sandwich and toast the crust side for 1 minute; top with tomato slices, close, slice and serve hot.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-perkedel",
    name: { en: "Perkedel-Style Chicken & Potato Patties", hindi: "चिकन आलू पैटी पर्केडेल" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 220 }, // chicken breast
      { foodId: "usda-2346401", grams: 240 }, // potatoes
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170922", grams: 2 }, // coriander seed
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Boil the potatoes in their skins for 18–20 minutes until tender; peel while warm and mash dry — no milk, no butter, perkedel mash is plain and dry so the patties hold.",
      "Poach the chicken in salted water for 12 minutes; cool and shred or mince very finely.",
      "Mix the mash with the chicken, finely chopped onion, garlic, crushed coriander seed, black pepper, salt and half the beaten egg; rest 10 minutes.",
      "Shape 8 firm patties with oiled hands.",
      "Dip each patty in the remaining beaten egg to coat.",
      "Fry in the oil over medium heat for 3–4 minutes per side until deep golden and crisp; drain on paper and serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-dimer-chop",
    name: { en: "Baked Egg & Potato Chops (Dimer Chop-Style)", hindi: "डिमेर चॉप अंडा आलू" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg
      { foodId: "usda-2346401", grams: 260 }, // potatoes
      { foodId: "usda-174288", grams: 60 }, // besan (chickpea flour)
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-172231", grams: 2 }, // turmeric
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Boil two-thirds of the eggs for 10 minutes; cool, peel and halve lengthways. Boil the potatoes until tender; peel and mash dry.",
      "Season the mash with the onion (finely chopped), ginger, green chilli, cumin, turmeric and salt — the Kolkata chop's spiced potato jacket.",
      "Encase each egg half in a smooth shell of the potato mixture, shaping a neat oval chop with no cracks.",
      "Set up a coating line: half the besan dry in one dish; the remaining eggs beaten with the rest of the besan and a splash of water into a thick batter in another.",
      "Roll each chop in the dry besan, then in the batter, then in dry besan again.",
      "Bake on an oiled rack at 210°C for 16–18 minutes, turning once and brushing with the oil, until the crust is deep golden and crisp — the baked answer to the fried chop.",
      "Serve hot, cut open to show the yolk.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-quinoa-black-bean-bites",
    name: { en: "Quinoa & Black Bean Bites", hindi: "क्विनोआ काला बीन बाइट्स" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168874", grams: 120 }, // quinoa
      { foodId: "usda-173734", grams: 160 }, // black beans, dry
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-169714", grams: 20 }, // rice flour
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the black beans overnight; boil in fresh water for 35–40 minutes until completely soft. Drain very well. Cook the quinoa in salted water for 14 minutes until the spirals unfurl; drain and steam dry.",
      "Mash half the beans coarsely; mix with the whole beans, quinoa, rice flour, finely chopped onion, garlic, cumin, chili powder, coriander leaves and salt into a firm mixture. Rest 10 minutes.",
      "With oiled hands, shape 12 small patties or balls.",
      "Heat the oil in a non-stick pan over medium heat; fry the bites 3–4 minutes per side until crisp and deep golden (or bake at 200°C for 18 minutes, turning once).",
      "Rest 2 minutes — they firm as they cool slightly.",
      "Serve warm, stacked in a bowl.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-turkey-pinwheels",
    name: { en: "Turkey & Mozzarella Pinwheels", hindi: "टर्की मोज़ेरेला पिनव्हील" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 110 }, // white flour
      { foodId: "usda-171098", grams: 200 }, // turkey breast (raw)
      { foodId: "usda-329370", grams: 80 }, // mozzarella
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-170929", grams: 2 }, // mustard seed, ground
      { foodId: "usda-322559", grams: 30 }, // nonfat milk
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with half the salt and about 65 ml warm water into a soft dough; rest 20 minutes, then roll into a thin rectangle about 25 × 30 cm.",
      "Slice the turkey breast into very thin cutlets (or pound slices thin); season with the remaining salt and the ground mustard seed and sear in a dry non-stick pan for 2 minutes per side until just cooked. Cool.",
      "Wilt the spinach in the same pan for 1 minute; squeeze dry and chop.",
      "Lay the turkey slices over the dough in a single layer; scatter the spinach and grated mozzarella evenly over.",
      "Roll up tightly from the long edge into a log; rest seam-side down for 10 minutes, then slice into 8 pinwheels with a sharp knife.",
      "Stand the pinwheels cut-side up on a tray, brush the tops with the milk, and bake at 190°C for 14–16 minutes until the pastry is golden and the cheese bubbling.",
      "Serve warm, spirals showing.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-paneer-pea-samosas",
    name: { en: "Baked Paneer & Pea Samosas", hindi: "पनीर मटर समोसा" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-168936", grams: 110 }, // white flour
      { foodId: "usda-328841", grams: 320 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-170419", grams: 100 }, // green peas
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-169231", grams: 6 }, // ginger
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Knead the flour with half the salt, a teaspoon of the oil and about 60 ml warm water into a stiff dough; rest 30 minutes — samosa dough is firm, never soft.",
      "Make the filling: drain the cottage cheese and crumble. Fry the cumin in a dry pan for 30 seconds; add the onion, ginger and green chilli for 3 minutes, then the peas for 2 minutes. Off the heat, fold in the cheese and remaining salt, and cool completely — a warm filling sweats the pastry.",
      "Divide the dough into 5 balls; roll each into a thin oval, cut in half, and form each half into a cone, sealing the seam with water.",
      "Fill each cone generously and seal the base firmly, pleating the edge.",
      "Brush the samosas all over with the remaining oil and bake at 200°C for 20–22 minutes, turning once, until deep golden and crisp — baked, not fried, and still shattering.",
      "Rest 5 minutes and serve hot.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-garlic-shrimp-skewers",
    name: { en: "Garlic Shrimp Skewers", hindi: "लहसुन झींगा सीक" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 270 }, // shrimp
      { foodId: "usda-171413", grams: 14 }, // olive oil
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Clean and devein the prawns, keeping the tails on. Marinate for 15 minutes in the olive oil with the garlic (finely grated), chili powder, salt and half the lemon juice.",
      "Thread the prawns onto soaked skewers, curving them into C-shapes so they cook evenly.",
      "Heat a grill pan (or grill) until smoking hot; lay the skewers down and cook 2 minutes per side — no longer — until pink, charred at the edges and just opaque in the centre.",
      "Rest 1 minute off the heat; the carryover finishes them gently.",
      "Squeeze the remaining lemon over and scatter the coriander leaves.",
      "Serve at once, straight off the skewers.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-sardine-egg-toasts",
    name: { en: "Sardine & Egg Flatbread Toasts", hindi: "सार्डिन अंडा टोस्ट" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175139", grams: 200 }, // sardines (canned in olive oil, drained)
      { foodId: "usda-171287", grams: 100 }, // egg
      { foodId: "usda-168893", grams: 90 }, // whole wheat flour
      { foodId: "usda-170457", grams: 80 }, // tomato
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-171413", grams: 8 }, // olive oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbreads: knead the flour with half the salt and about 55 ml warm water into a firm dough; rest 15 minutes, roll 2 thin rounds and cook on a dry hot tawa 1–2 minutes per side until puffed and spotted. Keep warm.",
      "Boil the eggs for 8 minutes; cool, peel and slice into rounds.",
      "Drain the sardines; split them open and lift out the backbones if you like (they are edible and calcium-rich — the honest cook keeps them).",
      "Toast the flatbreads again briefly in the olive oil until crisp at the edges.",
      "Rub the toasts with the cut tomato, then layer tomato slices, sardines and egg rounds over each.",
      "Finish with finely sliced onion, a squeeze of lemon and the remaining salt; serve at once while the base is still crisp.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-mackerel-pate-toasts",
    name: { en: "Mackerel Pâté Toasts", hindi: "मैकेरल पाटे टोस्ट" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 240 }, // mackerel (canned, drained)
      { foodId: "usda-328841", grams: 120 }, // cottage cheese
      { foodId: "usda-168893", grams: 90 }, // whole wheat flour
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Make the flatbreads: knead the flour with half the salt and about 55 ml warm water into a firm dough; rest 15 minutes, roll 2 thin rounds and cook on a dry hot tawa 1–2 minutes per side until puffed. Toast again just before serving so they are crisp.",
      "Drain the mackerel well; lift out any large bones and flake the flesh.",
      "Mash the mackerel with the drained cottage cheese, lemon juice, black pepper and remaining salt, working it with a fork into a coarse, spreadable pâté — rustic, not smooth.",
      "Fold in the chopped coriander leaves.",
      "Chill the pâté for 15 minutes so the flavours marry and it firms.",
      "Spread thickly over the warm crisp flatbread toasts and serve at once.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove", "fridge"],
  },
  {
    id: "dish-pw2-oats-cottage-patties",
    name: { en: "Oats & Cottage Cheese Patties", hindi: "ओट्स पनीर टिक्की" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2346396", grams: 110 }, // rolled oats
      { foodId: "usda-328841", grams: 300 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-172183", grams: 80 }, // egg white
      { foodId: "usda-2258586", grams: 60 }, // carrots
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Drain the cottage cheese in a cloth for 10 minutes, pressing out the whey; crumble finely.",
      "Mix the cheese with the oats, egg white, grated carrot, finely chopped onion, green chilli, coriander leaves and salt; rest 10 minutes so the oats drink the moisture and the mixture firms.",
      "Shape 8 patties with oiled hands, about 1.5 cm thick.",
      "Heat the oil in a non-stick pan over medium heat; fry the patties 3–4 minutes per side until deep golden and crisp, the oats toasting at the edges.",
      "Rest 2 minutes — they set as they cool slightly.",
      "Serve hot, straight off the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-tuna-potato-kebabs",
    name: { en: "Tuna & Potato Kebabs", hindi: "टूना आलू कबाब" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 240 }, // tuna (canned, drained)
      { foodId: "usda-2346401", grams: 200 }, // potatoes
      { foodId: "usda-172183", grams: 80 }, // egg white
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-170106", grams: 4 }, // red chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Boil the potatoes until tender; peel and mash completely dry. Drain the tuna very well — squeeze it in a cloth if needed; a wet kebab mixture will not hold.",
      "Mix the mash with the tuna, finely chopped onion, garlic, red chilli, coriander leaves, salt and half the egg white; rest 10 minutes.",
      "Shape 8 patties with oiled hands.",
      "Brush the patties with the remaining egg white to seal the surface.",
      "Fry in the oil over medium heat for 3–4 minutes per side until deep golden and crisp.",
      "Drain on paper for 1 minute and serve hot.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-roasted-soya-nuts",
    name: { en: "Roasted Soya Nuts with Chaat Masala", hindi: "भुनी सोया नट्स चाट मसाला" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-174270", grams: 150 }, // soybeans, dry
      { foodId: "usda-171025", grams: 6 }, // sunflower oil
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-170922", grams: 2 }, // coriander seed
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Soak the soybeans overnight; drain and boil in fresh water for 20 minutes until just tender but still holding their shape.",
      "Drain and dry the beans thoroughly — spread on a cloth for 30 minutes; surface water is the enemy of a crisp roast.",
      "Toss the beans with the oil and salt.",
      "Roast at 180°C for 25–30 minutes, shaking the tray every 10 minutes, until the beans are golden, dry and crunchy all the way through — test one: it should crack, not bend.",
      "While hot, toss with the cumin and coriander seed (toasted and crushed) and the chili powder so the spices cling to the oil.",
      "Cool completely — they crisp further as they cool — and store airtight for up to a week.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-mozzarella-sticks",
    name: { en: "Baked Mozzarella Sticks with Herb Crust", hindi: "बेक्ड मोज़ेरेला स्टिक्स" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-329370", grams: 210 }, // mozzarella
      { foodId: "usda-174288", grams: 50 }, // besan (chickpea flour)
      { foodId: "usda-172183", grams: 60 }, // egg white
      { foodId: "usda-1104647", grams: 4 }, // garlic
      { foodId: "usda-171319", grams: 2 }, // chili powder
      { foodId: "usda-171025", grams: 8 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Cut the mozzarella into 10 thick sticks about 1.5 × 7 cm. Freeze them on a tray for at least 1 hour — frozen cheese is the only way a baked stick keeps its shape while the crust crisps.",
      "Season the besan with the salt, chili powder and finely grated garlic. Put the beaten egg white in a second dish.",
      "Coat each frozen stick: besan, egg white, besan again, pressing the flour on firmly. Return to the freezer for 15 minutes while the oven heats to 220°C.",
      "Lay the sticks on an oiled rack over a tray; brush the tops with the oil.",
      "Bake for 7–9 minutes until the crust is deep golden and the cheese just begins to soften at the seams — pull them the moment they slump.",
      "Serve immediately, while the centre still pulls into strings.",
    ],
    timeMinutes: 25,
    budgetTier: 1,
    enriched: false,
    equipment: ["oven", "fridge"],
  },
  {
    id: "dish-pw2-corn-cottage-fritters",
    name: { en: "Sweet Corn & Cottage Cheese Fritters", hindi: "मकई पनीर फ्रिटर्स" },
    category: "snack",
    servings: 2,
    cuisine: "india",
    lines: [
      { foodId: "usda-2710826", grams: 260 }, // sweet corn
      { foodId: "usda-328841", grams: 300 }, // cottage cheese (the paneer stand-in)
      { foodId: "usda-174288", grams: 70 }, // besan (chickpea flour)
      { foodId: "usda-790646", grams: 50 }, // onion
      { foodId: "usda-170497", grams: 4 }, // green chilli
      { foodId: "usda-169997", grams: 6 }, // coriander leaves
      { foodId: "usda-171025", grams: 14 }, // sunflower oil
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Drain the cottage cheese well and crumble. Blitz half the corn briefly to a coarse cream and keep the rest whole — the blitzed corn binds, the whole kernels pop.",
      "Mix both corns with the cheese, besan, finely chopped onion, green chilli, coriander leaves and salt into a thick, spoonable batter; rest 5 minutes.",
      "Heat the oil in a non-stick pan over medium heat until shimmering.",
      "Drop heaped tablespoons of batter into the pan, flattening slightly; fry 3 minutes per side until deep golden and crisp, the corn caramelising at the edges.",
      "Drain on paper for 1 minute.",
      "Serve hot, in a tall stack.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove"],
  },
  {
    id: "dish-pw2-lentil-walnut-pate",
    name: { en: "Lentil & Walnut Pâté with Toasts", hindi: "दाल अखरोट पाटे" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2644283", grams: 160 }, // lentils, dry
      { foodId: "usda-2346394", grams: 44 }, // walnuts
      { foodId: "usda-168893", grams: 70 }, // whole wheat flour
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-167746", grams: 20 }, // lemon
      { foodId: "usda-170923", grams: 2 }, // cumin seeds
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Simmer the lentils in salted water for 20–25 minutes until completely soft; drain well, reserving a little cooking water.",
      "Make the toasts: knead the flour with a pinch of salt and about 45 ml warm water into a firm dough; rest 10 minutes, roll 2 thin rounds, cook on a dry tawa 1–2 minutes per side, then cut into wedges and toast again until crisp.",
      "Fry the onion in the olive oil for 7–8 minutes until deep golden and sweet; add the garlic and cumin for the last minute.",
      "Toast the walnuts in a dry pan for 3 minutes until fragrant.",
      "Blend the lentils with the onion mixture and walnuts, adding lemon juice, black pepper, salt and a splash of cooking water, until smooth but still textured — a pâté, not a soup.",
      "Chill at least 30 minutes so it firms and the flavours settle; serve with the crisp toasts.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "mixer_grinder", "fridge"],
  },
  {
    id: "dish-pw2-stuffed-mushrooms",
    name: { en: "Cheese & Egg Stuffed Mushrooms", hindi: "भरवां मशरूम चीज़ अंडा" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-328841", grams: 220 }, // cottage cheese
      { foodId: "usda-171287", grams: 200 }, // egg
      { foodId: "usda-329370", grams: 40 }, // mozzarella
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-168462", grams: 60 }, // spinach
      { foodId: "usda-173410", grams: 8 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Choose the largest mushrooms; twist out the stems and chop them finely. Salt the caps lightly and turn them cut-side down on paper for 10 minutes to weep.",
      "Boil the eggs for 9 minutes; cool, peel and chop small.",
      "Fry the chopped stems with the garlic in the butter for 4 minutes until golden; wilt in the spinach for 1 minute and take off the heat.",
      "Mix the stem mixture with the drained, crumbled cottage cheese, the chopped egg, black pepper and a pinch of salt.",
      "Fill the caps generously, mounding the mixture, and top with the grated mozzarella.",
      "Bake at 190°C for 12–14 minutes until the mushrooms are tender, the filling hot and the cheese golden in spots.",
      "Rest 3 minutes — the caps hold hot liquid — and serve.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
  {
    id: "dish-pw2-eggplant-cottage-rolls",
    name: { en: "Eggplant & Cottage Cheese Rolls", hindi: "बैंगन पनीर रोल" },
    category: "snack",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2685577", grams: 400 }, // eggplant
      { foodId: "usda-328841", grams: 340 }, // cottage cheese
      { foodId: "usda-329370", grams: 60 }, // mozzarella
      { foodId: "usda-170457", grams: 160 }, // tomato
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-171413", grams: 16 }, // olive oil
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Slice the eggplants lengthways into 8 thin sheets about 5 mm thick; salt them and rest 20 minutes to draw out moisture, then pat dry.",
      "Make a quick tomato sauce: fry the garlic in half the olive oil for 1 minute, add the chopped tomato and simmer 10 minutes into a thick sauce; season with salt and black pepper.",
      "Grill or sear the eggplant sheets in the remaining oil for 2–3 minutes per side until supple and golden in patches — they must bend without cracking.",
      "Mix the drained cottage cheese with the grated mozzarella and a pinch of salt and black pepper.",
      "Spoon the cheese mixture along one end of each sheet and roll up snugly.",
      "Lay the rolls seam-side down in a baking dish over a bed of the tomato sauce, spoon more sauce over, and bake at 190°C for 15 minutes until bubbling and the cheese melts out at the ends.",
      "Rest 3 minutes and serve hot.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
    equipment: ["stove", "oven"],
  },
];
