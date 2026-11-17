/**
 * Wave X-3 — international high-protein dishes: East & Southeast Asia,
 * the Americas and Latin America.
 *
 * The owner's rule for outside-India dishes is a hard bar, not a mood:
 * EVERY dish here computes to at least 25 g of protein per serving
 * through `dishNutrients` — pinned by dishLibraryIntl3.test.ts, which
 * computes rather than asserts. A dish that could not clear the bar
 * honestly was dropped, not padded.
 *
 * Honesty rules, same as the rest of the library: lines name only the
 * 142 USDA-verified reference foods; nutrition exists only as
 * `dishNutrients` computes it; no beef and no pork anywhere (a
 * deliberate programme omission). Where a classic seasoning is absent
 * from the verified set — soy sauce above all, but also miso, fish
 * sauce, gochujang, lemongrass, nori — the dish is either a classic
 * that is genuinely salt-seasoned (shioyaki, white cut chicken,
 * tomato-egg), composed truthfully without it, or not here at all.
 * No method ever names an ingredient no line carries.
 *
 * Every dish carries cuisine: "international" and a Devanagari
 * transliteration of its name in name.hindi.
 */

import type { Dish } from "../dishes";

export const INTL3_DISHES: readonly Dish[] = [
  /* ------------------------------ Japanese ------------------------------ */
  {
    id: "dish-jp-salmon-shioyaki",
    name: { en: "Salmon Shioyaki (Salt-Grilled Salmon)", hindi: "सैल्मन शियोयाकी" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 320 }, // salmon
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-167746", grams: 40 }, // lemon, for wedges
    ],
    method: [
      "Pat the salmon fillets dry and salt both sides evenly; rest at room temperature for 20 minutes so the salt seasons through and draws out surface moisture.",
      "Wipe off the moisture that beads on the surface — this is what lets the skin crisp instead of steam.",
      "Heat a heavy pan or grill over medium-high heat until hot; lay the salmon skin-side down and press gently for the first 10 seconds.",
      "Grill 5–6 minutes without moving, until the skin is crisp and golden and the flesh has turned opaque two-thirds of the way up the side.",
      "Flip once and cook 1–2 minutes more, until the centre is just translucent — salmon overcooks fast past this point.",
      "Rest 2 minutes and serve with the lemon wedges; the flesh should flake in large, moist layers.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-mackerel-shioyaki",
    name: { en: "Mackerel Shioyaki (Salt-Grilled Mackerel)", hindi: "मैकेरल शियोयाकी" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 340 }, // mackerel
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-167746", grams: 40 }, // lemon, for wedges
    ],
    method: [
      "Score the skin of the mackerel fillets twice with a sharp knife so the salt seasons evenly and the skin does not curl.",
      "Salt both sides and rest 15 minutes; wipe away the moisture that forms.",
      "Heat a pan over medium-high heat and lay the fillets skin-side down; cook 5 minutes until the skin is deeply golden and crisp.",
      "Flip and cook 2–3 minutes more, until the flesh flakes at the thickest part and the centre is just opaque.",
      "Rest 2 minutes off the heat — mackerel firms up as it rests.",
      "Serve with lemon wedges squeezed over at the table.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-grilled-sardines",
    name: { en: "Grilled Sardines, Japanese Style", hindi: "ग्रिल्ड सार्डिन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175139", grams: 260 }, // sardines, canned in oil, drained
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-169231", grams: 15 }, // ginger, grated to serve
      { foodId: "usda-167746", grams: 40 }, // lemon, for wedges
    ],
    method: [
      "Drain the sardines well and lay them on kitchen paper for 10 minutes — dry fish sears, wet fish steams.",
      "Season lightly with salt; the sardines are already rich, so a little goes far.",
      "Heat a grill pan over high heat until smoking lightly; lay the sardines in a single layer without crowding.",
      "Sear 2 minutes without moving, until the undersides are crisp and charred at the edges.",
      "Turn once with a thin spatula — sardines are fragile — and sear 1 minute more.",
      "Serve at once with the grated ginger and lemon wedges, in the iwashi shioyaki style.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-tamagoyaki",
    name: { en: "Tamagoyaki (Japanese Rolled Omelette)", hindi: "तमागोयाकी" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 360 }, // egg, whole
      { foodId: "usda-172183", grams: 60 }, // egg white
      { foodId: "usda-322892", grams: 120 }, // milk, whole
      { foodId: "usda-334247", grams: 4 }, // sugar
      { foodId: "usda-173468", grams: 2 }, // salt
      { foodId: "usda-171025", grams: 5 }, // sunflower oil, for the pan
    ],
    method: [
      "Whisk the eggs, egg white and milk until completely smooth, then whisk in the sugar and salt; strain if you want a perfectly even set.",
      "Heat a rectangular tamagoyaki pan (or a small non-stick pan) over medium-low heat and wipe it with a thin film of oil.",
      "Pour in a thin layer of egg — just enough to coat the base — and swirl; when it is set at the edges but still glossy on top, roll it toward you with chopsticks or a spatula.",
      "Push the roll to the far side, oil the pan again, and pour in the next thin layer, lifting the roll so the new layer flows underneath it.",
      "Roll back toward you, enclosing the first roll; repeat until all the egg is used and the roll is thick and layered.",
      "Slide onto a board, rest 2 minutes so the layers settle, then slice into thick pieces; the inside should be pale, moist and visibly layered.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-jp-goya-champuru",
    name: { en: "Goya Champuru (Okinawa Bitter Gourd Stir-Fry)", hindi: "गोया चंपुरु" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168393", grams: 300 }, // bitter gourd
      { foodId: "usda-172448", grams: 350 }, // tofu, firm
      { foodId: "usda-171287", grams: 150 }, // egg, whole
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-171016", grams: 10 }, // sesame oil
    ],
    method: [
      "Halve the bitter gourd lengthways, scrape out the seeds and pith, and slice into 5 mm half-moons; salt lightly and rest 10 minutes to draw out some bitterness, then rinse and pat dry.",
      "Press the tofu between plates for 10 minutes, then tear or cut into large bite-size chunks — torn edges brown better.",
      "Heat a wok over high heat with half the sesame oil; sear the tofu until golden on two sides, then lift out.",
      "Add the bitter gourd to the same wok and stir-fry 2–3 minutes until bright green and just tender at the edges.",
      "Return the tofu, push everything to the sides, and pour the beaten eggs into the centre; let them set 20 seconds, then fold everything together so the egg coats the tofu and gourd in soft curds.",
      "Season with salt, drizzle the remaining sesame oil, and serve at once — champuru should be juicy, not dry.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-jp-sesame-tofu-steak",
    name: { en: "Sesame Tofu Steak with Edamame", hindi: "तिल टोफू स्टेक" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 400 }, // tofu, firm
      { foodId: "usda-168410", grams: 120 }, // edamame
      { foodId: "usda-168936", grams: 30 }, // wheat flour, for dusting
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-169231", grams: 15 }, // ginger, grated
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Press the tofu for 15 minutes under a weighted plate, then cut into thick steaks and pat very dry.",
      "Season the steaks with salt and dust lightly with flour on both sides.",
      "Heat the sesame oil in a wide pan over medium-high heat; lay in the tofu and leave it alone for 3–4 minutes until a deep golden crust forms.",
      "Flip once and crust the second side for 3 minutes; the centre should stay silky while the outside crackles.",
      "Scatter the edamame into the pan for the last 2 minutes so it blisters in the hot oil.",
      "Serve the steaks topped with grated ginger and the sesame seeds, with the edamame alongside.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-jp-japanese-chicken-curry",
    name: { en: "Japanese Chicken Curry", hindi: "जापानी चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2346401", grams: 400 }, // potato
      { foodId: "usda-2258586", grams: 200 }, // carrots
      { foodId: "usda-790646", grams: 200 }, // onion
      { foodId: "usda-168936", grams: 60 }, // wheat flour, for the roux
      { foodId: "usda-173410", grams: 40 }, // butter
      { foodId: "usda-170924", grams: 12 }, // curry powder
      { foodId: "usda-171688", grams: 100 }, // apple, grated
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cut the chicken into large chunks, the potato and carrot into rolling wedges, and slice the onion thickly.",
      "Make the roux: melt the butter in a small pan, stir in the flour and cook over low heat, stirring constantly, for 4–5 minutes until it smells nutty and turns light tan; stir in the curry powder and take off the heat.",
      "In a large pot, sear the chicken in its own fat until lightly coloured; add the onion and cook until soft.",
      "Add the potato, carrot and about 800 ml water; simmer 15 minutes until the vegetables are just tender.",
      "Ladle some hot cooking liquid into the roux and whisk smooth, then stir the roux back into the pot.",
      "Add the grated apple and salt; simmer 8–10 minutes more, stirring, until the curry is thick and glossy and coats the back of a spoon.",
      "Rest 5 minutes — Japanese curry thickens as it stands — and serve over rice.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-turkey-hambagu",
    name: { en: "Turkey Hambagu with Mushroom Sauce", hindi: "टर्की हंबागु" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-790646", grams: 150 }, // onion, finely diced
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-2346396", grams: 40 }, // oats, as binder
      { foodId: "usda-1750347", grams: 200 }, // mushrooms
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-322892", grams: 100 }, // milk, whole
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Cook the diced onion in a little of the butter until soft and sweet, then cool completely — hot onion would cook the egg in the mix.",
      "Soak the oats in the milk for 5 minutes, then combine with the turkey, egg, cooled onion, salt and pepper; mix with your hands just until it holds together.",
      "Divide into 4 thick oval patties, tossing each from hand to hand to drive out air pockets, and press a shallow dent in the centre of each.",
      "Sear in a hot pan for 3 minutes per side until well browned, then add a splash of water, cover and steam-cook 6–7 minutes until the juices run clear.",
      "Lift the patties out and rest them; in the same pan, melt the remaining butter and fry the mushrooms until golden.",
      "Add 150 ml water to the mushroom pan and scrape up the browned bits; simmer 2 minutes into a loose pan sauce.",
      "Serve the hambagu with the mushroom sauce spooned over.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-ginger-chicken",
    name: { en: "Japanese Ginger Chicken (Shogayaki Style)", hindi: "जापानी अदरक चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-169231", grams: 40 }, // ginger, grated
      { foodId: "usda-1104647", grams: 10 }, // garlic, grated
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-2346407", grams: 200 }, // cabbage, finely shredded, to serve
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the chicken breast into thin, even pieces against the grain so it cooks in minutes and stays tender.",
      "Marinate with the grated ginger, garlic, sugar and salt for 15 minutes — ginger juice is the whole sauce in shogayaki.",
      "Shred the cabbage finely and soak in cold water so it crisps; drain well before serving.",
      "Heat a wide pan over high heat with the sesame oil until it shimmers.",
      "Lay the chicken in a single layer and sear 2 minutes without moving, until the edges caramelise.",
      "Turn and cook 1–2 minutes more, tossing so the ginger juices glaze every piece; the chicken should be just cooked and glossy.",
      "Serve over the drained cabbage, which wilts slightly under the hot chicken.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-salmon-egg-rice-bowl",
    name: { en: "Salmon Flake & Egg Rice Bowl", hindi: "सैल्मन चावल कटोरा" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 300 }, // salmon
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry
      { foodId: "usda-173468", grams: 4 }, // salt
      { foodId: "usda-170150", grams: 8 }, // sesame seeds
      { foodId: "usda-171016", grams: 8 }, // sesame oil
    ],
    method: [
      "Cook the rice and keep it warm, covered.",
      "Salt the salmon and grill or pan-sear skin-side down for 6–7 minutes until just cooked; rest 2 minutes.",
      "Flake the salmon with a fork into large pieces, discarding skin and any bones — these flakes are the classic salmon soboro topping.",
      "Scramble the eggs in the sesame oil over low heat, stirring slowly, until they form soft, just-set curds; season with a pinch of the salt.",
      "Divide the rice between bowls and spoon the salmon flakes over one half and the scrambled egg over the other.",
      "Finish with the sesame seeds and serve at once, mixing everything together at the table.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-eggplant-tofu-stirfry",
    name: { en: "Japanese Eggplant & Tofu Stir-Fry", hindi: "बैंगन टोफू स्टर-फ्राई" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 450 }, // tofu, firm
      { foodId: "usda-2685577", grams: 400 }, // eggplant
      { foodId: "usda-168410", grams: 100 }, // edamame
      { foodId: "usda-169231", grams: 20 }, // ginger, julienned
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Press the tofu for 10 minutes and cut into large cubes; cut the eggplant into chunky wedges and salt them for 10 minutes, then pat dry.",
      "Heat a wok over high heat with the sesame oil; sear the tofu until golden on several sides and lift out.",
      "Add the eggplant to the same wok and stir-fry 4–5 minutes until soft, glossy and collapsing at the edges.",
      "Add the ginger and edamame and toss for 1 minute until the edamame is bright green.",
      "Return the tofu, season with salt, and toss everything together for 1 minute so the eggplant's juices coat the tofu.",
      "Serve at once — the eggplant should be silky and the tofu still crisp at the edges.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-steamed-chicken-sesame",
    name: { en: "Steamed Chicken with Sesame Cabbage", hindi: "भाप चिकन तिल पत्तागोभी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-2346407", grams: 300 }, // cabbage
      { foodId: "usda-170150", grams: 20 }, // sesame seeds, ground
      { foodId: "usda-171016", grams: 15 }, // sesame oil
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pound the chicken breasts to an even thickness and salt them well; rest 10 minutes.",
      "Slice the cabbage into wide ribbons and arrange in a steamer basket as a bed.",
      "Lay the chicken over the cabbage with the sliced ginger on top; steam, covered, for 12–14 minutes until the chicken is just cooked through and juicy.",
      "Meanwhile grind the sesame seeds coarsely and mix with the sesame oil and a pinch of salt into a loose dressing.",
      "Lift the chicken out, rest 3 minutes, then slice thickly across the grain.",
      "Serve the chicken over the steamed cabbage — which has caught all the juices — with the sesame dressing spooned over.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-jp-breakfast-plate",
    name: { en: "Japanese Breakfast Plate (Salmon, Tamagoyaki, Rice)", hindi: "जापानी नाश्ता थाली" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 200 }, // salmon
      { foodId: "usda-171287", grams: 150 }, // egg, whole
      { foodId: "usda-2512381", grams: 160 }, // white rice, dry
      { foodId: "usda-168462", grams: 100 }, // spinach
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the rice and keep warm. Salt the salmon and set aside for 10 minutes.",
      "Whisk the eggs with a pinch of salt and cook as a small rolled omelette in a lightly oiled pan over low heat, rolling in layers; rest and slice thickly.",
      "Grill the salmon skin-side down for 5–6 minutes until crisp and just cooked; flip for the final minute.",
      "Wilt the spinach in the hot pan for 30 seconds with the sesame oil and a pinch of salt, until just collapsed and glossy.",
      "Arrange everything in separate mounds on warm plates — rice, salmon, omelette slices and spinach — in the ichiju-sansai breakfast style.",
      "Serve at once, while the salmon skin is still crisp.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------- Korean ------------------------------- */
  {
    id: "dish-kr-chicken-bibimbap",
    name: { en: "Chicken Bibimbap", hindi: "चिकन बिबिंबाप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-2512381", grams: 320 }, // white rice, dry
      { foodId: "usda-171287", grams: 200 }, // egg, whole
      { foodId: "usda-2258586", grams: 150 }, // carrots, julienned
      { foodId: "usda-168462", grams: 200 }, // spinach
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cook the rice and keep it hot. Slice the chicken into thin strips and season with salt and half the garlic.",
      "Prepare each vegetable separately, bibimbap style: blanch the spinach, squeeze dry and dress with sesame oil and salt; julienne the carrots and stir-fry briefly until just softened.",
      "Stir-fry the mushrooms over high heat until golden and their liquid has evaporated; blanch the green beans until bright green and tender-crisp.",
      "Sear the chicken strips in a hot pan until cooked through and lightly caramelised at the edges.",
      "Fry the eggs sunny-side up, whites set and yolks still runny.",
      "Arrange the rice in warm bowls and lay each vegetable and the chicken in separate mounds on top, by colour.",
      "Crown each bowl with a fried egg, scatter the sesame seeds, and serve — everything is mixed together at the table.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-tofu-bibimbap",
    name: { en: "Tofu Bibimbap", hindi: "टोफू बिबिंबाप" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 350 }, // tofu, firm
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-2512381", grams: 160 }, // white rice, dry
      { foodId: "usda-168462", grams: 100 }, // spinach
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1750347", grams: 100 }, // mushrooms
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-170150", grams: 6 }, // sesame seeds
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the rice and keep hot. Press the tofu for 10 minutes and cut into thick slices.",
      "Sear the tofu in a hot pan with a little of the sesame oil until golden and crisp on both sides; season with salt.",
      "Blanch the spinach, squeeze dry and dress with sesame oil and salt; stir-fry the julienned carrots and the mushrooms separately until just tender.",
      "Fry the eggs sunny-side up with set whites and runny yolks.",
      "Bowl the rice and arrange the tofu and each vegetable in separate mounds over it.",
      "Top with the fried eggs and sesame seeds; mix everything together at the table.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-sundubu-jjigae",
    name: { en: "Sundubu Jjigae (Soft Tofu Stew)", hindi: "सुंडुबु जिगे" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 350 }, // tofu, firm (soft tofu is not in the set)
      { foodId: "usda-175179", grams: 150 }, // shrimp (prawns)
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-1750347", grams: 100 }, // mushrooms
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Heat the sesame oil in a heavy pot and fry the chopped red chilli and garlic for 30 seconds until the oil turns red and fragrant — this chilli oil is the stew's base.",
      "Add the onion and mushrooms and cook 3 minutes until softened.",
      "Pour in about 500 ml water, bring to a boil, and season with salt; simmer 5 minutes to build the broth.",
      "Cut the tofu into large chunks and slide them in; simmer 3 minutes without stirring hard, so the tofu stays in soft curds.",
      "Add the shrimp and cook 2 minutes until they turn pink and curl.",
      "Crack the eggs straight into the bubbling stew, cover for 1 minute so they poach in the broth, and serve at a rolling boil, straight from the pot.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-gyeran-mari",
    name: { en: "Gyeran-Mari (Korean Rolled Egg)", hindi: "ग्येरान-मारी" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 360 }, // egg, whole
      { foodId: "usda-172183", grams: 60 }, // egg white
      { foodId: "usda-2258586", grams: 60 }, // carrots, finely diced
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-168462", grams: 50 }, // spinach, finely chopped
      { foodId: "usda-322892", grams: 60 }, // milk, whole
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-171025", grams: 5 }, // sunflower oil, for the pan
    ],
    method: [
      "Whisk the eggs, egg white and milk with the salt until smooth; stir in the finely diced carrot, onion and spinach — dice everything small so the roll holds together.",
      "Heat a non-stick pan over low heat and wipe with a thin film of oil.",
      "Pour in a third of the egg mixture and swirl to a thin layer; when just set on top, roll it up to one side of the pan.",
      "Slide the roll back, oil the pan again, and pour in the next third, lifting the roll so the new layer runs underneath.",
      "Roll again to enclose it; repeat with the last third until you have a thick, layered roll.",
      "Rest 2 minutes, then slice into 2 cm pieces; the cut faces should show the vegetables set in golden layers.",
    ],
    timeMinutes: 20,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-kr-dak-gomtang",
    name: { en: "Dak Gomtang (Korean Chicken Soup)", hindi: "दक गोमतांग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-1104647", grams: 30 }, // garlic, whole cloves
      { foodId: "usda-169231", grams: 20 }, // ginger, sliced
      { foodId: "usda-790646", grams: 100 }, // onion, quartered
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Put the chicken, whole garlic cloves, ginger and onion in a large pot with about 1.5 litres of water; bring to a boil and skim the foam.",
      "Lower to a gentle simmer and cook 25 minutes, until the chicken is tender and the broth is fragrant and lightly milky.",
      "Lift out the chicken, rest 5 minutes, then shred it into bite-size pieces by hand, discarding any skin.",
      "Cook the rice separately until just done.",
      "Return the shredded chicken to the strained broth, season with salt and black pepper, and simmer 3 minutes to marry the flavours.",
      "Serve the soup over bowls of rice, with extra salt and pepper at the table — gomtang is seasoned by the eater.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-haemul-pajeon",
    name: { en: "Haemul Pajeon (Seafood Pancake)", hindi: "हेमुल पाजोन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 200 }, // shrimp (prawns)
      { foodId: "usda-168936", grams: 120 }, // wheat flour
      { foodId: "usda-171287", grams: 120 }, // egg, whole
      { foodId: "usda-790646", grams: 80 }, // onion, sliced into strips
      { foodId: "usda-168462", grams: 60 }, // spinach, roughly chopped
      { foodId: "usda-171016", grams: 12 }, // sesame oil, for frying
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the flour, eggs, salt and about 120 ml cold water into a batter the thickness of single cream; rest 10 minutes.",
      "Cut the shrimp into small pieces so they cook through in the pancake's short fry.",
      "Fold the shrimp, onion strips and spinach through the batter.",
      "Heat a wide pan over medium-high heat with the sesame oil; ladle in half the batter and spread it thin and even.",
      "Fry 3–4 minutes until the underside is crisp and deep golden at the edges; flip once and fry 2–3 minutes more, pressing gently.",
      "Repeat with the second pancake; serve both cut into wedges, crisp-edged and steaming.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-dak-juk",
    name: { en: "Dak Juk (Korean Chicken Porridge)", hindi: "दक जुक" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-2258586", grams: 100 }, // carrots, finely diced
      { foodId: "usda-1104647", grams: 15 }, // garlic, minced
      { foodId: "usda-169231", grams: 15 }, // ginger, minced
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Rinse the rice and soak it for 30 minutes; drain. Poach the chicken in about 1.2 litres of water for 15 minutes, then lift out, shred finely and reserve the broth.",
      "Heat the sesame oil in a heavy pot and fry the garlic and ginger for 30 seconds until fragrant.",
      "Add the soaked rice and stir for 2 minutes so every grain is coated and turns translucent at the edges.",
      "Pour in the reserved broth, bring to a boil, then simmer on the lowest heat for 25 minutes, stirring often, until the rice breaks down into a thick porridge.",
      "Stir in the shredded chicken and diced carrot and simmer 5 minutes more until the carrot is tender.",
      "Season with salt; the juk should be loose and spoonable — add a little hot water if it thickens too far — and serve steaming.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-kong-guksu",
    name: { en: "Kong-Guksu (Soy Milk Noodle Soup)", hindi: "कोंग-गुक्सु" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174270", grams: 150 }, // soybeans, dry
      { foodId: "usda-168893", grams: 120 }, // whole wheat flour, for noodles
      { foodId: "usda-2346406", grams: 100 }, // cucumber, julienned
      { foodId: "usda-170150", grams: 10 }, // sesame seeds
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the soybeans overnight, then boil them for 15 minutes until tender; drain and rub off the loose skins.",
      "Blend the soybeans with about 600 ml fresh cold water until completely smooth and milky; season this soy milk with salt and chill it — kong-guksu broth is served cold and is seasoned only with salt.",
      "Knead the flour with about 60 ml water and a pinch of the salt into a firm dough; rest 20 minutes, then roll very thin and cut into noodles.",
      "Boil the noodles for 3–4 minutes until just chewy; drain and rinse under cold water to stop the cooking and firm them up.",
      "Divide the cold noodles between bowls and pour the chilled soy milk over.",
      "Top with the julienned cucumber and sesame seeds and serve immediately, while everything is cold.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-kr-steamed-egg-shrimp",
    name: { en: "Gyeran-Jjim (Korean Steamed Egg with Shrimp)", hindi: "ग्येरान-जिम" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole
      { foodId: "usda-175179", grams: 100 }, // shrimp (prawns), chopped
      { foodId: "usda-171016", grams: 6 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the eggs with the salt and about 200 ml warm water until completely smooth — the water is what makes gyeran-jjim soufflé-soft.",
      "Stir in the chopped shrimp, distributing them evenly.",
      "Pour into a heatproof bowl or earthenware pot, cover tightly with a lid or foil, and set over a steamer of simmering water.",
      "Steam on the lowest heat for 12–15 minutes, until the egg has puffed and set with a gentle wobble in the centre — high heat would make it spongy and full of holes.",
      "Drizzle with the sesame oil the moment it comes off the heat.",
      "Serve at once, before it settles, spooned straight from the bowl.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-spicy-chicken-stew",
    name: { en: "Korean Spicy Chicken & Potato Stew", hindi: "कोरियाई मसालेदार चिकन स्टू" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-2346401", grams: 400 }, // potato, in chunks
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171319", grams: 10 }, // chili powder
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into large pieces and the potato and carrot into chunks that will hold together through a braise.",
      "Put the chicken in a wide pot with about 600 ml water, the garlic, chili powder, sugar and salt; bring to a boil and skim.",
      "Simmer 10 minutes, then add the potato, carrot and onion wedges.",
      "Cover and braise 15–18 minutes, turning the pieces once, until the potato is tender and the chicken is cooked through.",
      "Uncover and boil 3–4 minutes to reduce the broth into a glossy, fiery sauce that coats the chicken.",
      "Rest 5 minutes and serve with rice, spooning the sauce over everything.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-grilled-mackerel-chilli",
    name: { en: "Grilled Mackerel with Chilli-Garlic Glaze", hindi: "मिर्च-लहसुन मैकेरल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 340 }, // mackerel
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-1104647", grams: 12 }, // garlic, minced
      { foodId: "usda-334247", grams: 6 }, // sugar
      { foodId: "usda-173469", grams: 10 }, // cider vinegar
      { foodId: "usda-173468", grams: 3 }, // salt
      { foodId: "usda-167746", grams: 30 }, // lemon, to serve
    ],
    method: [
      "Stir the chili powder, garlic, sugar, vinegar and salt into a thick glaze with a spoonful of water.",
      "Score the mackerel skin, season the flesh lightly, and grill skin-side down over medium-high heat for 5 minutes until crisp.",
      "Flip the fillets and brush the flesh generously with the chilli-garlic glaze.",
      "Grill 2–3 minutes more, until the glaze bubbles and darkens at the edges and the fish flakes.",
      "Rest 2 minutes so the glaze sets.",
      "Serve with lemon wedges, the skin still crisp under its fiery coat.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-kr-egg-fried-rice",
    name: { en: "Korean Egg Fried Rice", hindi: "कोरियाई अंडा फ्राइड राइस" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry
      { foodId: "usda-170419", grams: 100 }, // peas, green
      { foodId: "usda-2258586", grams: 80 }, // carrots, finely diced
      { foodId: "usda-790646", grams: 80 }, // onion, finely diced
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the rice and spread it on a tray to cool and dry for at least 20 minutes — dry rice fries, wet rice steams.",
      "Scramble the eggs in a hot wok with half the sesame oil, keeping them in large soft curds; lift out while still glossy.",
      "Add the remaining oil and stir-fry the onion, carrot and peas for 2 minutes until the carrot softens.",
      "Add the cold rice, breaking up every clump, and toss over high heat for 3–4 minutes until the grains are separate and lightly toasted.",
      "Return the eggs, season with salt, and toss for 1 minute so the curds break through the rice.",
      "Serve at once, steaming, with the sesame fragrance up front.",
    ],
    timeMinutes: 30,
    budgetTier: 2,
    enriched: false,
  },
  /* ------------------------------- Chinese ------------------------------ */
  {
    id: "dish-cn-white-cut-chicken",
    name: { en: "White Cut Chicken with Ginger Oil", hindi: "सफेद कटा चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 700 }, // chicken breast
      { foodId: "usda-169231", grams: 50 }, // ginger, finely minced
      { foodId: "usda-1104647", grams: 10 }, // garlic, finely minced
      { foodId: "usda-171016", grams: 20 }, // sesame oil
      { foodId: "usda-169997", grams: 15 }, // coriander leaves
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Bring a large pot of water to a boil with a few ginger slices from the measured ginger; slide the chicken in, return to a bare simmer, then turn off the heat, cover and poach for 18 minutes — white cut chicken is poached off the boil so the flesh stays silken.",
      "Lift the chicken into cold water for 5 minutes to firm the skin and stop the cooking; reserve the poaching liquid.",
      "Drain and chop the chicken through the bone into bite-size pieces, or slice thickly if boneless, and arrange on a warm plate.",
      "For the dip: put the minced ginger and garlic in a heatproof bowl with the salt; heat the sesame oil until it just smokes and pour it over — it should sizzle fiercely.",
      "Stir a spoonful of hot poaching liquid into the ginger oil to loosen it.",
      "Spoon the ginger oil over the chicken, scatter the coriander leaves, and serve with the rest of the dip alongside.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-tomato-egg-stirfry",
    name: { en: "Tomato & Egg Stir-Fry", hindi: "टमाटर अंडा स्टर-फ्राई" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 360 }, // egg, whole
      { foodId: "usda-172183", grams: 60 }, // egg white
      { foodId: "usda-170457", grams: 300 }, // tomatoes, in wedges
      { foodId: "usda-334247", grams: 5 }, // sugar
      { foodId: "usda-171025", grams: 12 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Whisk the eggs and egg white with half the salt until the yolks and whites are fully combined.",
      "Heat a wok until smoking, add half the oil, and pour in the eggs; push them gently with a spatula into large, soft curds and lift them out while still glossy — they finish later in the tomato juices.",
      "Add the remaining oil and the tomato wedges; stir-fry 2–3 minutes until the tomatoes slump and release their red juice.",
      "Season the tomatoes with the remaining salt and the sugar — the pinch of sugar is what makes this dish taste like itself.",
      "Return the eggs to the wok and fold through for 30 seconds, so the curds drink up the tomato sauce without overcooking.",
      "Serve at once over rice, glossy and saucy.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-steamed-fish-ginger",
    name: { en: "Cantonese Steamed Fish with Ginger", hindi: "भाप मछली अदरक" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 360 }, // tilapia
      { foodId: "usda-169231", grams: 30 }, // ginger, julienned
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Pat the fish dry and season with salt; lay half the ginger underneath it on a heatproof plate — the fish must sit above its own juices.",
      "Bring the steamer water to a rolling boil before the fish goes in; steaming must start at full heat.",
      "Steam the fish, covered, for 8–10 minutes depending on thickness, until the flesh is just opaque and flakes at the spine.",
      "Tip away the steaming liquid on the plate — it tastes muddy — and scatter the remaining ginger and the coriander over the fish.",
      "Heat the sesame oil until it just smokes and pour it over the ginger; it should sizzle and release the aroma instantly.",
      "Serve at once, flaking the fish at the table.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-hot-sour-soup",
    name: { en: "Hot & Sour Soup with Chicken", hindi: "गरम खट्टा सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 260 }, // chicken breast, shredded
      { foodId: "usda-172448", grams: 300 }, // tofu, firm, in strips
      { foodId: "usda-171287", grams: 150 }, // egg, whole, beaten
      { foodId: "usda-1750347", grams: 200 }, // mushrooms, sliced
      { foodId: "usda-173469", grams: 30 }, // cider vinegar
      { foodId: "usda-170931", grams: 4 }, // black pepper, generously
      { foodId: "usda-168936", grams: 15 }, // wheat flour, as a light slurry
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Simmer about 1 litre of water with the mushrooms for 5 minutes to build the base; season with the salt.",
      "Add the shredded chicken and poach for 3 minutes until just cooked.",
      "Stir in the tofu strips and bring back to a simmer.",
      "Whisk the flour with a little cold water into a thin slurry and stir it in; simmer 1 minute until the soup is lightly silky, not gluey.",
      "Stir the soup in one direction and drizzle in the beaten egg so it sets in fine ribbons.",
      "Take off the heat and add the vinegar, black pepper and sesame oil — the sour and the heat both go in last, or they fade. Taste: it should be assertively sour first, then peppery.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: true,
    enrichment: "Chicken breast added to the classic tofu, egg and mushroom soup.",
  },
  {
    id: "dish-cn-chicken-corn-soup",
    name: { en: "Chicken & Sweetcorn Soup", hindi: "चिकन मकई सूप" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 400 }, // chicken breast, minced
      { foodId: "usda-2710826", grams: 300 }, // corn kernels
      { foodId: "usda-172183", grams: 120 }, // egg white
      { foodId: "usda-171287", grams: 60 }, // egg, whole
      { foodId: "usda-168936", grams: 15 }, // wheat flour, as a light slurry
      { foodId: "usda-171016", grams: 6 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blend a third of the corn with a little water until creamy; leave the rest whole — the blend is what gives this soup its body.",
      "Bring about 900 ml water to a simmer with the minced chicken, breaking the mince up with a whisk so it separates into fine strands; skim well.",
      "Stir in the blended and whole corn and simmer 5 minutes until sweet and fragrant.",
      "Add the flour slurry and simmer 1 minute until the soup turns silky.",
      "Season with salt, then stir in one direction and drizzle in the beaten egg and egg white to form soft clouds.",
      "Finish with the sesame oil and serve at once.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-prawn-wontons",
    name: { en: "Prawn Wontons in Ginger Broth", hindi: "झींगा वॉनटन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 260 }, // shrimp (prawns)
      { foodId: "usda-168936", grams: 110 }, // wheat flour, for wrappers
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-168462", grams: 80 }, // spinach
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with about 55 ml water and a pinch of the salt into a smooth dough; rest 30 minutes, then roll paper-thin and cut into 8 cm squares.",
      "Chop two-thirds of the shrimp finely and cut the rest into small chunks; mix with half the grated ginger, the sesame oil and the remaining salt — the two textures are the wonton's signature.",
      "Place a teaspoon of filling in the centre of each wrapper, wet the edges, fold into a triangle and pinch the corners together, squeezing out air so they do not burst.",
      "Simmer about 800 ml water with the remaining ginger slices for 5 minutes to make the light broth; season with salt.",
      "Boil the wontons in a separate pot of water for 3–4 minutes, until they float and the wrappers turn translucent.",
      "Wilt the spinach in the hot broth, divide the wontons between bowls, and ladle the ginger broth over.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-salt-pepper-shrimp",
    name: { en: "Salt & Pepper Shrimp", hindi: "नमक काली मिर्च झींगा" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-168936", grams: 30 }, // wheat flour, for dusting
      { foodId: "usda-1104647", grams: 15 }, // garlic, sliced
      { foodId: "usda-170106", grams: 10 }, // red hot chilli, sliced
      { foodId: "usda-170931", grams: 3 }, // black pepper, cracked
      { foodId: "usda-171411", grams: 15 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pat the shrimp completely dry and toss with the flour, half the salt and the cracked pepper until lightly coated.",
      "Heat a wok until smoking, add the oil, and fry the shrimp in a single layer for 1 minute per side until crisp and coral-pink; lift out.",
      "Add the garlic slices and chilli to the same wok and fry 30 seconds until the garlic is golden at the edges.",
      "Return the shrimp with the remaining salt and toss over the highest heat for 30 seconds so every shrimp is flecked with garlic and chilli.",
      "Serve immediately, while the coating is still crisp — this dish waits for no one.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-home-style-tofu",
    name: { en: "Home-Style Tofu with Edamame & Peppers", hindi: "घर-शैली टोफू" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 450 }, // tofu, firm
      { foodId: "usda-168410", grams: 100 }, // edamame
      { foodId: "usda-170108", grams: 100 }, // red sweet pepper
      { foodId: "usda-170427", grams: 100 }, // green sweet pepper
      { foodId: "usda-1750347", grams: 100 }, // mushrooms
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Press the tofu for 10 minutes and cut into thick triangles or slabs; pat dry so it browns instead of steaming.",
      "Pan-fry the tofu in the oil over medium-high heat until golden on both sides; lift out — this crust is what makes home-style tofu worth eating.",
      "In the same pan, stir-fry the garlic, peppers and mushrooms for 2–3 minutes until the peppers soften at the edges.",
      "Add the edamame and about 100 ml water; simmer 2 minutes.",
      "Return the tofu, season with salt, and braise 3 minutes so the tofu drinks up the pan juices without losing its crust.",
      "Serve at once, glossy and steaming.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-steamed-egg-prawns",
    name: { en: "Steamed Egg with Prawns", hindi: "भाप अंडा झींगा" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole
      { foodId: "usda-175179", grams: 150 }, // shrimp (prawns)
      { foodId: "usda-171016", grams: 6 }, // sesame oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the eggs with the salt and about 300 ml warm water until smooth; strain into a shallow heatproof bowl to remove bubbles — straining is the difference between silk and sponge.",
      "Arrange the prawns over the egg mixture; they will suspend as it sets.",
      "Cover the bowl tightly and steam over gently simmering water for 10–12 minutes, until the surface is just set with a slight wobble — never boil it hard.",
      "Rest, covered, for 2 minutes; the centre will finish setting in the residual heat.",
      "Drizzle with the sesame oil and serve at once, scooping through the custard to the prawns.",
    ],
    timeMinutes: 20,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-hainanese-chicken-rice",
    name: { en: "Hainanese Chicken Rice", hindi: "हैनानी चिकन चावल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-2512381", grams: 320 }, // white rice, dry
      { foodId: "usda-169231", grams: 40 }, // ginger
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-170106", grams: 20 }, // red hot chilli, for the sauce
      { foodId: "usda-2346406", grams: 200 }, // cucumber, to serve
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken gently: bring a large pot of water with half the ginger and garlic to a boil, add the chicken, return to the barest simmer, then cover, turn off the heat and leave 25 minutes.",
      "Lift out the chicken and plunge into cold water for 5 minutes so the skin sets smooth and the flesh stays juicy; reserve every drop of the poaching liquid.",
      "Fry the remaining garlic and ginger in the sesame oil until fragrant, add the rinsed rice and stir until the grains are glossy.",
      "Cook the rice in the poaching liquid instead of water — this is the dish: rice that tastes of chicken.",
      "For the chilli sauce, pound the red chillies with a pinch of salt and a ladle of hot poaching liquid until loose and fiery.",
      "Slice the chicken thickly, serve over the rice with cucumber slices and the chilli sauce alongside.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-moo-goo-gai-pan",
    name: { en: "Moo Goo Gai Pan (Chicken & Mushrooms)", hindi: "मू गू गाई पैन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast, thinly sliced
      { foodId: "usda-1750347", grams: 250 }, // mushrooms
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-2258586", grams: 100 }, // carrots, sliced
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Slice the chicken thinly against the grain and season with salt; slice the mushrooms thickly so they keep their bite.",
      "Blanch the green beans and carrot slices for 2 minutes until just tender; drain.",
      "Heat a wok until smoking, add the oil and ginger, then sear the chicken in a single layer until just cooked; lift out.",
      "Stir-fry the mushrooms over high heat until they release their liquid and it evaporates — this concentrates their flavour.",
      "Return the chicken with the blanched vegetables and about 80 ml water; toss for 1–2 minutes until the light sauce coats everything, glossy and clear — moo goo gai pan is a white, delicate stir-fry, never dark.",
      "Serve at once over rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-egg-foo-young",
    name: { en: "Egg Foo Young (Shrimp & Egg Patties)", hindi: "एग फू यंग" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole
      { foodId: "usda-175179", grams: 120 }, // shrimp (prawns), chopped
      { foodId: "usda-2346407", grams: 100 }, // cabbage, finely shredded
      { foodId: "usda-2346400", grams: 80 }, // green beans, finely sliced
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the eggs with the salt until smooth; fold in the chopped shrimp, cabbage, beans and onion — the mixture should be more filling than egg.",
      "Heat a pan over medium heat with a little of the oil until hot.",
      "Ladle in a quarter of the mixture as a thick patty, keeping it round and compact.",
      "Fry 2–3 minutes until the underside is deep golden and the edges are lacy; flip and fry 1–2 minutes more until the shrimp are cooked and the centre just set.",
      "Repeat for four patties, adding oil as needed.",
      "Serve stacked and steaming, crisp at the edges and soft in the middle.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-gong-bao-chicken",
    name: { en: "Gong Bao Chicken with Peanuts", hindi: "गोंग बाओ चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-172430", grams: 70 }, // peanuts
      { foodId: "usda-170106", grams: 15 }, // red hot chilli, dried-style heat from fresh
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-173469", grams: 15 }, // cider vinegar
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 12 }, // ginger
      { foodId: "usda-171410", grams: 12 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into 2 cm cubes and season with salt; cut the pepper into matching squares.",
      "Stir the vinegar, sugar and a splash of water into a glaze; have everything within reach — gong bao cooks in minutes.",
      "Heat a wok until smoking, add the peanut oil and the chillies, and fry 20 seconds until they darken and the oil smells fiery.",
      "Add the chicken in a single layer; sear undisturbed for 1 minute, then stir-fry until just cooked and golden at the edges.",
      "Add the garlic, ginger and peppers; stir-fry 1 minute, keeping the peppers crisp.",
      "Pour in the glaze and toss over the highest heat for 30 seconds until it turns glossy and clings to the chicken.",
      "Fold in the peanuts last, toss once, and serve immediately over rice.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-sesame-chilli-noodles",
    name: { en: "Sesame Chilli Noodles with Minced Turkey", hindi: "तिल मिर्च नूडल्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 260 }, // ground turkey
      { foodId: "usda-168893", grams: 140 }, // whole wheat flour, for noodles
      { foodId: "usda-170150", grams: 30 }, // sesame seeds, ground to a paste
      { foodId: "usda-2346406", grams: 100 }, // cucumber, julienned
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171319", grams: 6 }, // chili powder
      { foodId: "usda-171016", grams: 12 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with about 70 ml water and a pinch of the salt into a stiff dough; rest 20 minutes, roll thin and cut into noodles.",
      "Grind the sesame seeds to a rough paste with the sesame oil, garlic, chili powder and the remaining salt; loosen with a few spoonfuls of hot water into a pourable sauce.",
      "Brown the minced turkey in a dry-hot pan, breaking it into small crisp crumbles; season lightly.",
      "Boil the noodles for 3–4 minutes until just chewy; drain, reserving a cup of the cooking water.",
      "Toss the hot noodles through the sesame sauce, adding splashes of noodle water until every strand is coated and glossy.",
      "Serve topped with the crisped turkey and the julienned cucumber for contrast.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-clay-pot-chicken",
    name: { en: "Clay Pot Chicken & Mushrooms", hindi: "मिट्टी बर्तन चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-1750347", grams: 300 }, // mushrooms
      { foodId: "usda-169231", grams: 25 }, // ginger, sliced
      { foodId: "usda-168462", grams: 150 }, // spinach
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Season the chicken pieces with salt and the sesame oil; halve the mushrooms so they braise without disappearing.",
      "Heat a clay pot or heavy casserole and sear the chicken until lightly golden; add the ginger slices.",
      "Add the mushrooms and about 200 ml water; bring to a simmer, cover and braise on the lowest heat for 18–20 minutes, until the chicken is tender and the mushrooms have given their juices to the broth.",
      "Taste and adjust the salt; the broth should be light, savoury and gingery.",
      "Fold in the spinach and cover for 1 minute until just wilted.",
      "Serve straight from the pot, steaming, over rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-cn-chicken-congee",
    name: { en: "Chicken Congee with Egg", hindi: "चिकन कांजी" },
    category: "breakfast",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 450 }, // chicken breast
      { foodId: "usda-2512381", grams: 180 }, // white rice, dry
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-169231", grams: 25 }, // ginger, julienned
      { foodId: "usda-171016", grams: 8 }, // sesame oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken in about 1.4 litres of water for 15 minutes; lift out, shred finely, and keep the broth.",
      "Rinse the rice and add it to the broth with the ginger; bring to a boil, then simmer 35–40 minutes, stirring often, until the grains burst and the congee turns thick and creamy.",
      "Return the shredded chicken and simmer 3 minutes.",
      "Beat the eggs and stir them in a thin stream so they set in soft ribbons through the congee.",
      "Season with salt — congee should taste gentle, not bland — and finish with the sesame oil.",
      "Serve in warm bowls; the texture should be like a loose, savoury porridge.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
  /* -------------------------------- Thai -------------------------------- */
  {
    id: "dish-th-pad-thai",
    name: { en: "Pad Thai with Shrimp, Tofu & Egg", hindi: "पैड थाई" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-169714", grams: 160 }, // rice flour, for noodle sheets
      { foodId: "usda-175179", grams: 180 }, // shrimp (prawns)
      { foodId: "usda-172448", grams: 150 }, // tofu, firm
      { foodId: "usda-171287", grams: 120 }, // egg, whole
      { foodId: "usda-172430", grams: 40 }, // peanuts, crushed
      { foodId: "usda-167763", grams: 40 }, // tamarind
      { foodId: "usda-2346400", grams: 80 }, // green beans, cut short
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-171410", grams: 12 }, // peanut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Make the noodles: whisk the rice flour with about 320 ml water into a thin batter; steam thin layers of it in an oiled plate for 2 minutes each until set, then oil, stack and cut into 1 cm ribbons.",
      "Soak the tamarind in 100 ml warm water for 10 minutes, squeeze out the pulp and strain; stir in the sugar and salt — this sweet-sour liquor is the pad thai sauce.",
      "Press and cube the tofu; sear in a hot wok with the peanut oil until golden, then lift out.",
      "Sear the shrimp for 1 minute until just pink; lift out with the tofu.",
      "Scramble the eggs in the same wok into soft curds, then add the noodles and the tamarind sauce; toss over high heat for 2 minutes until the noodles drink up the sauce and turn glossy.",
      "Return the tofu and shrimp with the green beans; toss 1 minute more until everything is hot and the beans are bright.",
      "Serve showered with the crushed peanuts, with lemon if you have it — the plate should taste sour first, then sweet, then salty.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-chicken-cashew",
    name: { en: "Thai Chicken with Cashews", hindi: "थाई काजू चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-2515374", grams: 70 }, // cashew nuts
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into bite-size cubes and season with salt; cut the peppers and onion into squares.",
      "Toast the cashews in a dry wok until deep golden; set aside for the end so they stay crisp.",
      "Heat the wok until smoking, add the oil, and sear the chicken until just cooked with golden edges; lift out.",
      "Stir-fry the onion, peppers and chilli for 2 minutes, keeping the vegetables crisp and bright.",
      "Return the chicken with the garlic and a splash of water; toss over high heat for 1 minute until glossy.",
      "Fold in the cashews, toss once, and serve immediately over rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-chicken-larb",
    name: { en: "Larb Gai (Thai Minced Chicken Salad)", hindi: "लार्ब गाई" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 300 }, // chicken breast, minced
      { foodId: "usda-2512381", grams: 40 }, // white rice, for toasted rice powder
      { foodId: "usda-173475", grams: 15 }, // mint leaves
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-167746", grams: 60 }, // lemon, for juice
      { foodId: "usda-790646", grams: 80 }, // onion, thinly sliced
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Toast the dry rice in a dry pan, stirring, until deep golden and nutty; grind coarsely — this khao khua gives larb its signature crunch and aroma.",
      "Poach the minced chicken in a little water over medium heat, breaking it into fine crumbles, until just cooked and still juicy; take off the heat with its juices.",
      "While warm, season the chicken with the salt and most of the lemon juice; the meat should taste bright and salty.",
      "Fold in the sliced onion, chopped chilli, mint and coriander.",
      "Stir in the toasted rice powder at the very end so it stays crunchy.",
      "Taste and adjust lemon and salt — larb should be sour and fiery first — and serve warm or at room temperature with cabbage or cucumber if you have them.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-tofu-larb",
    name: { en: "Tofu Larb with Mushrooms & Peanuts", hindi: "टोफू लार्ब" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 450 }, // tofu, firm, crumbled
      { foodId: "usda-1750347", grams: 150 }, // mushrooms, chopped
      { foodId: "usda-172430", grams: 40 }, // peanuts, crushed
      { foodId: "usda-2512381", grams: 40 }, // white rice, for toasted rice powder
      { foodId: "usda-173475", grams: 15 }, // mint leaves
      { foodId: "usda-167746", grams: 60 }, // lemon, for juice
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Toast the dry rice until deep golden and grind coarsely for the rice powder.",
      "Crumble the tofu into rough pieces and sear in a hot pan with the oil until the edges crisp and turn golden — dry tofu takes on flavour; wet tofu just steams.",
      "Add the mushrooms and cook until their liquid evaporates and they brown.",
      "Take off the heat and season with salt and most of the lemon juice while warm.",
      "Fold in the chilli, mint and crushed peanuts, then the toasted rice powder last so it stays crunchy.",
      "Taste for sour, salt and heat, adjust, and serve warm.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-gai-yang",
    name: { en: "Gai Yang (Thai Grilled Chicken)", hindi: "गाई यांग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-170172", grams: 150 }, // coconut milk, for the marinade
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-1104647", grams: 20 }, // garlic, pounded
      { foodId: "usda-170922", grams: 5 }, // coriander seed, ground
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pound the garlic with the coriander seed, turmeric, sugar and salt into a rough paste; stir in the coconut milk.",
      "Coat the chicken thighs thoroughly and marinate at least 1 hour, or overnight — gai yang is a marinated grill, not a seasoned one.",
      "Heat a grill or heavy pan over medium heat; shake the excess marinade off the chicken, keeping it for basting.",
      "Grill skin-side down first for 8–10 minutes until the skin renders and chars at the edges.",
      "Turn and grill 6–8 minutes more, basting with the marinade, until cooked through and the surface is lacquered and smoky.",
      "Rest 5 minutes, then chop through the bone into serving pieces in the Thai style and serve hot.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-massaman-chicken",
    name: { en: "Massaman Chicken Curry", hindi: "मसामन चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-172430", grams: 60 }, // peanuts
      { foodId: "usda-2346401", grams: 300 }, // potato, in chunks
      { foodId: "usda-790646", grams: 150 }, // onion, in wedges
      { foodId: "usda-170924", grams: 10 }, // curry powder
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-170919", grams: 3 }, // cardamom
      { foodId: "usda-167763", grams: 30 }, // tamarind
      { foodId: "usda-334247", grams: 10 }, // sugar
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the tamarind in warm water and strain out the pulp liquor.",
      "Spoon the thick top of the coconut milk into a pot and fry the curry powder, cinnamon and cardamom in it for 2 minutes until the oil separates and the spices smell warm and sweet — massaman is a gentle, spiced curry, not a fiery one.",
      "Add the chicken and coat in the spiced coconut; pour in the remaining coconut milk.",
      "Simmer 10 minutes, then add the potato chunks and onion wedges.",
      "Cook 15–18 minutes more until the potato is tender and the chicken is soft.",
      "Stir in the peanuts, tamarind liquor, sugar and salt; simmer 3 minutes. Taste: sweet, sour and salty in balance, with the peanuts still distinct. Serve over rice.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-coconut-chicken-curry",
    name: { en: "Thai Chicken Coconut Curry", hindi: "थाई नारियल चिकन करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-170924", grams: 12 }, // curry powder
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-2346400", grams: 150 }, // green beans
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Fry the curry powder, chopped chilli and ginger in the thick top of the coconut milk for 2 minutes until the oil glistens red at the edges.",
      "Add the chicken slices and turn them in the spiced coconut until sealed.",
      "Pour in the rest of the coconut milk and simmer 8 minutes.",
      "Add the pepper strips and green beans and simmer 4–5 minutes more, until the vegetables are just tender and still bright.",
      "Season with salt and rest 3 minutes; the curry should be rich, fiery and fragrant, with the coconut still sweet underneath.",
      "Serve over rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-fish-cakes",
    name: { en: "Tod Mun Pla (Thai Fish Cakes)", hindi: "थाई मछली केक" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 320 }, // tilapia
      { foodId: "usda-2346400", grams: 100 }, // green beans, finely sliced
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169714", grams: 20 }, // rice flour, to bind
      { foodId: "usda-167746", grams: 30 }, // lemon, to serve
      { foodId: "usda-171410", grams: 15 }, // peanut oil, for frying
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pound or blend the fish with the garlic, chilli and salt into a smooth, sticky paste — work it until it turns springy; that bounce is the whole texture of tod mun.",
      "Fold in the rice flour and the finely sliced green beans, distributing the beans evenly.",
      "With wet hands, shape the paste into small flat discs about 1 cm thick; wet hands keep the paste from sticking.",
      "Heat the oil in a wide pan over medium heat until it shimmers.",
      "Fry the cakes for 2–3 minutes per side until puffed, deep golden and bouncy when pressed.",
      "Drain briefly and serve hot with lemon wedges.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-fried-fish-tamarind",
    name: { en: "Fried Fish with Tamarind Chilli Sauce", hindi: "इमली मिर्च मछली" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 340 }, // tilapia
      { foodId: "usda-167763", grams: 50 }, // tamarind
      { foodId: "usda-334247", grams: 15 }, // sugar
      { foodId: "usda-1104647", grams: 15 }, // garlic, sliced
      { foodId: "usda-170106", grams: 15 }, // red hot chilli, sliced
      { foodId: "usda-171410", grams: 15 }, // peanut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Soak the tamarind in 120 ml warm water, squeeze and strain; simmer the liquor with the sugar and a pinch of the salt until it thickens to a glossy, sweet-sour sauce.",
      "Fry the garlic and chilli slices in a little of the oil until the garlic is golden; lift out and stir into the sauce.",
      "Pat the fish very dry, season with the remaining salt, and fry in the remaining oil over medium-high heat for 4–5 minutes per side until the skin is crisp and the flesh flakes.",
      "Rest the fish 2 minutes on a rack so the skin stays crisp.",
      "Spoon the warm tamarind chilli sauce over the fish — it should shine and pool, not drown.",
      "Serve at once, crisp skin against the sticky, fiery sauce.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-shrimp-fried-rice",
    name: { en: "Khao Pad Goong (Thai Shrimp Fried Rice)", hindi: "थाई झींगा फ्राइड राइस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 200 }, // shrimp (prawns)
      { foodId: "usda-171287", grams: 120 }, // egg, whole
      { foodId: "usda-2512381", grams: 180 }, // white rice, dry
      { foodId: "usda-170457", grams: 100 }, // tomato, in wedges
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-2346406", grams: 100 }, // cucumber, to serve
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the rice and cool it completely, spread on a tray — Thai fried rice is made with cold rice so the grains stay separate.",
      "Sear the shrimp in a smoking wok with half the oil for 1 minute until just pink; lift out.",
      "Scramble the eggs in the same wok into soft curds and lift out.",
      "Add the remaining oil and stir-fry the onion for 1 minute; add the cold rice and toss over the highest heat for 3 minutes until the grains are glossy and separate.",
      "Return the shrimp and eggs with the tomato wedges; season with salt and toss 1 minute until the tomato just softens.",
      "Serve with the cucumber alongside, in the Thai style — cool and crisp against the hot rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-kai-jeow",
    name: { en: "Kai Jeow (Thai Omelette with Minced Chicken)", hindi: "काई जियो" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole
      { foodId: "usda-2646170", grams: 120 }, // chicken breast, finely minced
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-171411", grams: 15 }, // soybean oil, generously, for the crisp edges
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the eggs with the salt until completely liquid and slightly frothy — air in the eggs is what puffs a kai jeow.",
      "Stir in the finely minced chicken, distributing it evenly so it cooks through in the fry.",
      "Heat a wok over high heat and add the oil — more than feels reasonable; kai jeow fries, it does not sauté.",
      "When the oil smokes lightly, pour the egg in from a height so it blooms and bubbles at the edges.",
      "Fry 1–2 minutes until the underside is deep golden and lacy-crisp; the top will still be soft.",
      "Flip once — confidently — and fry 30 seconds more. Serve at once over rice, crisp-edged and puffed, scattered with coriander.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: true,
    enrichment: "Minced chicken folded into the classic plain Thai omelette.",
  },
  {
    id: "dish-th-sour-fish-curry",
    name: { en: "Gaeng Som (Sour Tamarind Fish Curry)", hindi: "खट्टा मछली करी" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-167763", grams: 80 }, // tamarind
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-2346400", grams: 200 }, // green beans
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pound the chillies, garlic and turmeric into a rough paste — gaeng som's paste is short and fierce.",
      "Soak the tamarind in 800 ml warm water, squeeze and strain the liquor into a pot.",
      "Bring the tamarind liquor to a boil, stir in the paste and salt, and simmer 5 minutes until the raw smell of the chilli cooks out.",
      "Add the tomatoes and green beans and simmer 4 minutes until just tender.",
      "Slide in the fish pieces and poach gently for 5–6 minutes, without stirring hard, until the flesh just flakes.",
      "Taste: it should be sharply sour and hot, with no sweetness to hide behind. Serve over rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-pineapple-fried-rice",
    name: { en: "Thai Pineapple Fried Rice", hindi: "अनानास फ्राइड राइस" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 180 }, // shrimp (prawns)
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-2512381", grams: 170 }, // white rice, dry
      { foodId: "usda-169124", grams: 150 }, // pineapple, in chunks
      { foodId: "usda-2515374", grams: 30 }, // cashew nuts
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170924", grams: 3 }, // curry powder
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the rice and cool it completely, spread out on a tray.",
      "Toast the cashews in a dry wok until golden; set aside.",
      "Sear the shrimp in the hot wok with half the oil for 1 minute; lift out, then scramble the eggs into soft curds and lift out.",
      "Add the remaining oil, the turmeric and curry powder, and fry 20 seconds until fragrant; add the cold rice and toss over high heat for 3 minutes until every grain is golden.",
      "Add the pineapple chunks and toss 1 minute until their edges caramelise slightly.",
      "Return the shrimp and eggs, season with salt, toss once, and serve showered with the cashews.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-th-pad-prik-king",
    name: { en: "Pad Prik King (Chicken & Green Beans)", hindi: "पैड प्रिक किंग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-2346400", grams: 300 }, // green beans
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-171410", grams: 12 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pound the chillies, garlic and ginger into a coarse paste — pad prik king is a dry curry, so the paste is the sauce.",
      "Cut the chicken into thin slices and the beans into short lengths.",
      "Heat a wok until smoking, add the oil and the paste, and fry 1 minute until it darkens and smells intensely savoury.",
      "Add the chicken and stir-fry 3–4 minutes until it takes the paste's colour and is nearly cooked.",
      "Add the beans with a splash of water and stir-fry 2–3 minutes until bright green and just tender, the paste clinging to everything.",
      "Season with salt and serve at once over rice — there should be almost no liquid in the wok.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  /* ----------------------------- Vietnamese ----------------------------- */
  {
    id: "dish-vn-pho-ga",
    name: { en: "Pho Ga (Vietnamese Chicken Pho)", hindi: "फो गा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-169714", grams: 240 }, // rice flour, for noodle sheets
      { foodId: "usda-790646", grams: 150 }, // onion, halved and charred
      { foodId: "usda-169231", grams: 40 }, // ginger, charred
      { foodId: "usda-171323", grams: 4 }, // fennel seed, for the anise note
      { foodId: "usda-171320", grams: 3 }, // cinnamon
      { foodId: "usda-171321", grams: 2 }, // cloves
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-167746", grams: 60 }, // lemon, for wedges
      { foodId: "usda-170497", grams: 10 }, // green chilli, sliced, to serve
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Char the halved onion and ginger directly over a flame or in a dry pan until blackened in patches — this gives pho broth its depth and colour.",
      "Simmer the chicken in about 1.6 litres of water with the charred onion and ginger, the fennel seed, cinnamon and cloves for 20 minutes, skimming carefully; a clear broth is pho's whole point.",
      "Lift out the chicken, shred it, and strain the broth; season the broth with salt — it should taste clean, aromatic and lightly sweet from the onion.",
      "Make the noodles: steam thin layers of rice-flour batter (flour whisked with about 480 ml water) in an oiled plate for 2 minutes each, then oil, stack and cut into wide ribbons.",
      "Blanch the noodles briefly in boiling water and divide between warm bowls.",
      "Top with the shredded chicken, ladle the boiling broth over, and serve with coriander, green chilli and lemon wedges at the table.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-banh-xeo",
    name: { en: "Banh Xeo (Vietnamese Sizzling Crepes)", hindi: "बान सेओ" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-169714", grams: 170 }, // rice flour
      { foodId: "usda-175179", grams: 220 }, // shrimp (prawns)
      { foodId: "usda-174256", grams: 90 }, // mung beans, dry, cooked for the filling
      { foodId: "usda-171287", grams: 60 }, // egg, whole, for the batter
      { foodId: "usda-172231", grams: 3 }, // turmeric, for colour
      { foodId: "usda-170172", grams: 100 }, // coconut milk, for the batter
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the mung beans in water until soft and just holding their shape; drain.",
      "Whisk the rice flour, turmeric, egg, coconut milk, salt and about 250 ml water into a thin batter; rest 20 minutes.",
      "Heat a wide pan over high heat with a little oil until it just smokes — banh xeo must sizzle loudly when the batter lands (xeo is the sound).",
      "Scatter a few shrimp over the pan, ladle in a thin layer of batter and swirl to coat; sprinkle a spoonful of mung beans over.",
      "Cover for 1 minute to steam the top, then uncover and fry 2 minutes more until the edges are lacy and crisp and the base is golden.",
      "Fold the crepe in half, slide onto a plate, and repeat. Serve at once, cut into pieces, while the edges still crackle.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-canh-chua",
    name: { en: "Canh Chua (Vietnamese Sour Fish Soup)", hindi: "कान्ह चुआ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 550 }, // tilapia
      { foodId: "usda-167763", grams: 70 }, // tamarind
      { foodId: "usda-170457", grams: 200 }, // tomatoes, in wedges
      { foodId: "usda-169124", grams: 150 }, // pineapple, in chunks
      { foodId: "usda-169260", grams: 150 }, // okra, cut in lengths
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Soak the tamarind in about 1 litre of warm water, squeeze and strain the liquor into a pot.",
      "Bring the liquor to a boil with the garlic and salt; simmer 3 minutes.",
      "Add the pineapple and tomatoes and simmer 4 minutes until the broth turns sweet-sour and fragrant.",
      "Add the okra and green beans and cook 3 minutes until just tender.",
      "Slide in the fish pieces and poach gently for 4–5 minutes, without stirring, until the flesh just flakes.",
      "Taste — canh chua should be boldly sour, then sweet from the pineapple — and serve over rice.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-ga-kho-gung",
    name: { en: "Ga Kho Gung (Vietnamese Ginger Chicken)", hindi: "गा खो गुंग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // chicken thigh
      { foodId: "usda-169231", grams: 50 }, // ginger, julienned
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-334247", grams: 12 }, // sugar, for the caramel
      { foodId: "usda-170931", grams: 3 }, // black pepper, generously
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the chicken into bite-size pieces and season with salt and the black pepper.",
      "Heat the oil in a clay pot or heavy pan and melt the sugar in it, swirling, until it turns deep amber — this caramel is the dish's colour and depth; do not let it burn.",
      "Add the chicken at once and toss so the caramel coats it; it will seize, then loosen as the chicken releases its juices.",
      "Add the ginger and garlic and braise, covered, on low heat for 15 minutes, stirring once or twice.",
      "Uncover and reduce for 3–4 minutes until the sauce is dark, sticky and clinging to the chicken.",
      "Serve over rice with extra black pepper — ga kho gung should be peppery, gingery and glossy.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-goi-ga",
    name: { en: "Goi Ga (Vietnamese Chicken & Cabbage Salad)", hindi: "गोई गा" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 320 }, // chicken breast
      { foodId: "usda-2346407", grams: 250 }, // cabbage, finely shredded
      { foodId: "usda-2258586", grams: 100 }, // carrots, julienned
      { foodId: "usda-173475", grams: 15 }, // mint leaves
      { foodId: "usda-790646", grams: 80 }, // onion, thinly sliced
      { foodId: "usda-172430", grams: 30 }, // peanuts, crushed
      { foodId: "usda-167746", grams: 60 }, // lemon, for juice
      { foodId: "usda-334247", grams: 8 }, // sugar
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Poach the chicken gently in salted water for 12–14 minutes until just cooked; rest, then shred by hand into long, fine strands — hand-shredding gives goi ga its texture.",
      "Soak the sliced onion in cold water for 10 minutes to take off its raw bite; drain.",
      "Stir the lemon juice, sugar and salt into a dressing; taste for a bright sweet-sour balance.",
      "Combine the chicken, cabbage, carrot, onion and mint in a large bowl.",
      "Pour the dressing over and toss with your hands, lightly crushing the cabbage so it wilts into the dressing.",
      "Rest 10 minutes so the flavours marry, then serve showered with the crushed peanuts.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-turmeric-fish",
    name: { en: "Turmeric Fried Fish with Peanuts", hindi: "हल्दी तली मछली" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 340 }, // tilapia
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-172430", grams: 30 }, // peanuts, crushed
      { foodId: "usda-168936", grams: 20 }, // wheat flour, for dusting
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Rub the fish with the turmeric and salt and rest 15 minutes — the turmeric both colours and firms the flesh.",
      "Dust lightly with flour, shaking off the excess.",
      "Heat the oil in a wide pan over medium-high heat and fry the fish for 4 minutes per side until deep golden and crisp, the flesh flaking cleanly.",
      "Rest 2 minutes on a rack so the crust stays crisp.",
      "Serve scattered with the crushed peanuts and coriander leaves, in the ca chien nghe style.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-banh-cuon",
    name: { en: "Banh Cuon Tom (Shrimp Rice Rolls)", hindi: "बान कुओन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-169714", grams: 150 }, // rice flour
      { foodId: "usda-175179", grams: 250 }, // shrimp (prawns)
      { foodId: "usda-1750347", grams: 100 }, // mushrooms, finely chopped
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Whisk the rice flour with about 330 ml water and a pinch of the salt into a thin batter; rest 20 minutes.",
      "Stir-fry the onion and mushrooms until dry and fragrant; add the chopped shrimp and cook 1 minute until just pink; season with the remaining salt and cool.",
      "Steam the rolls: ladle a thin layer of batter into an oiled plate set over boiling water, cover and steam 1–2 minutes until the sheet turns translucent and set.",
      "Lift the sheet out, lay a spoonful of filling along one edge, and roll it up loosely around the filling.",
      "Repeat until the batter and filling are used, keeping the finished rolls covered so they stay soft.",
      "Serve warm, the rolls delicate and slippery, with the shrimp showing through the translucent rice sheets.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-vn-chicken-curry",
    name: { en: "Ca Ri Ga (Vietnamese Chicken Curry)", hindi: "का री गा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-170172", grams: 300 }, // coconut milk
      { foodId: "usda-2346401", grams: 300 }, // potato, in chunks
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-170924", grams: 12 }, // curry powder
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Marinate the chicken pieces with half the curry powder, the garlic and salt for 15 minutes.",
      "Fry the onion in a little of the coconut milk's thick top until soft; add the remaining curry powder and fry 1 minute until fragrant.",
      "Add the chicken and seal on all sides.",
      "Pour in the coconut milk and about 200 ml water; simmer 10 minutes.",
      "Add the potato and carrot and simmer 12–15 minutes more, until the vegetables are tender and the curry has turned a deep golden orange.",
      "Rest 5 minutes and serve over rice — ca ri ga is a soupier, gentler curry than its Thai cousins.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------- Indonesian / Malaysian ------------------------ */
  {
    id: "dish-id-chicken-rendang",
    name: { en: "Chicken Rendang", hindi: "चिकन रेंडांग" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // chicken thigh
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-170169", grams: 50 }, // coconut meat, toasted for kerisik
      { foodId: "usda-170106", grams: 20 }, // red hot chilli
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-169231", grams: 30 }, // ginger
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-170922", grams: 5 }, // coriander seed
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Toast the coconut meat in a dry pan, stirring constantly, until deep mahogany; pound it into an oily paste — this kerisik is rendang's dark, nutty soul.",
      "Blend or pound the chillies, ginger, garlic, turmeric and coriander seed into a spice paste.",
      "Put the chicken, coconut milk, spice paste and salt in a wide pot; bring to a boil, then lower to a steady simmer.",
      "Cook uncovered for 30 minutes, stirring now and then, until the coconut milk reduces and thickens around the chicken.",
      "Stir in the kerisik and tamarind pulp; keep cooking and stirring for 10–15 minutes more as the sauce darkens, splits into its oil and clings to the meat — rendang is cooked past curry, almost to a fry.",
      "Rest 10 minutes; the chicken should be tender enough to tear and coated in a dark, intensely spiced paste. Serve with rice.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-nasi-lemak",
    name: { en: "Nasi Lemak with Spiced Fried Chicken", hindi: "नासी लेमक" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170172", grams: 200 }, // coconut milk, for the rice
      { foodId: "usda-2646171", grams: 500 }, // chicken thigh
      { foodId: "usda-171287", grams: 200 }, // egg, whole, boiled
      { foodId: "usda-172430", grams: 50 }, // peanuts, fried
      { foodId: "usda-2346406", grams: 150 }, // cucumber, sliced
      { foodId: "usda-170106", grams: 15 }, // red hot chilli, for sambal
      { foodId: "usda-1104647", grams: 10 }, // garlic, for sambal
      { foodId: "usda-172231", grams: 4 }, // turmeric, for the chicken
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Cook the rice in the coconut milk topped up with water and a good pinch of salt, until tender and fragrant; rest, covered, for 10 minutes.",
      "Rub the chicken with the turmeric and salt; fry in a little oil until cooked through and crisp at the edges.",
      "Boil the eggs for 9 minutes, cool, peel and halve.",
      "Make a quick sambal: pound the chillies and garlic with a pinch of salt and fry the paste in a spoonful of oil for 2 minutes until it darkens and smells cooked, not raw.",
      "Fry the peanuts in a dry pan until golden.",
      "Serve each plate with a mound of coconut rice, a piece of chicken, half an egg, cucumber slices, a spoonful of sambal and a scatter of peanuts — nasi lemak is a plate of contrasts, eaten mixed.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-gado-gado",
    name: { en: "Gado Gado with Peanut Sauce", hindi: "गाडो गाडो" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-172448", grams: 300 }, // tofu, firm
      { foodId: "usda-171287", grams: 120 }, // egg, whole, boiled
      { foodId: "usda-172430", grams: 70 }, // peanuts, for the sauce
      { foodId: "usda-2346401", grams: 150 }, // potato
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-2346407", grams: 100 }, // cabbage
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-170106", grams: 8 }, // red hot chilli
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make the sauce: blend the peanuts with the chilli, tamarind liquor, salt and about 150 ml warm water; simmer 5 minutes until it thickens to a pouring consistency — gado gado sauce should coat, not flood.",
      "Boil the eggs for 9 minutes; peel and halve. Boil the potato until tender and cut into chunks.",
      "Blanch the green beans and cabbage leaves briefly until just tender and bright; drain well — watery vegetables dilute the sauce.",
      "Pan-fry the tofu in a little oil until golden on both sides; slice thickly.",
      "Arrange the potato, beans, cabbage, tofu and eggs on a platter in generous mounds.",
      "Pour the warm peanut sauce over everything and serve at once, tossing at the table.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-soto-ayam",
    name: { en: "Soto Ayam (Indonesian Chicken Soup)", hindi: "सोतो आयम" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-2512381", grams: 240 }, // white rice, dry
      { foodId: "usda-171287", grams: 100 }, // egg, whole, boiled
      { foodId: "usda-172231", grams: 5 }, // turmeric
      { foodId: "usda-169231", grams: 25 }, // ginger
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-2346407", grams: 150 }, // cabbage, shredded
      { foodId: "usda-167746", grams: 40 }, // lemon, for wedges
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Pound the garlic, ginger and turmeric into a paste and fry in a little oil until fragrant and golden — this paste turns the broth its signature yellow.",
      "Add about 1.4 litres of water and the chicken; simmer 15 minutes, skimming, until the chicken is cooked.",
      "Lift out the chicken, shred it coarsely, and return the broth to a simmer; season with salt.",
      "Cook the rice separately; boil the eggs for 9 minutes, peel and halve.",
      "Divide the rice between bowls, top with shredded chicken, cabbage and egg halves.",
      "Ladle the boiling golden broth over and serve with lemon wedges — soto is eaten with a squeeze of citrus and as much chilli as you dare.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-bakso-ayam",
    name: { en: "Bakso Ayam (Chicken Meatball Soup)", hindi: "बक्सो आयम" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast, for meatballs
      { foodId: "usda-171287", grams: 60 }, // egg, whole, binder
      { foodId: "usda-168936", grams: 40 }, // wheat flour, binder
      { foodId: "usda-2346407", grams: 150 }, // cabbage
      { foodId: "usda-2258586", grams: 100 }, // carrots
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Blend or mince the chicken very finely with the garlic, salt and pepper, then work in the egg and flour until the mixture is smooth, pale and sticky — bakso should be springy, and the working is what makes it so.",
      "Bring a large pot of water to just below a simmer — never a rolling boil, which toughens the meatballs.",
      "With wet hands, squeeze balls of the mixture between thumb and finger and scoop them into the water; they are done 2 minutes after they float.",
      "Lift the meatballs out and keep the cooking water as the broth; season it with ginger and salt and simmer the cabbage and carrot in it until just tender.",
      "Return the meatballs to heat through for 2 minutes.",
      "Serve the soup steaming, the meatballs bouncy when bitten.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-tempeh-sambal",
    name: { en: "Fried Tempeh with Sambal", hindi: "तला टेम्पेह संबल" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 320 }, // tempeh
      { foodId: "usda-170106", grams: 20 }, // red hot chilli, for sambal
      { foodId: "usda-1104647", grams: 15 }, // garlic
      { foodId: "usda-170457", grams: 100 }, // tomato, for sambal
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-171410", grams: 12 }, // peanut oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the tempeh into slices about 1 cm thick and season with salt.",
      "Fry the tempeh in the oil over medium heat for 3–4 minutes per side until deep golden and crisp at the edges — tempeh should be nutty and firm, never soggy.",
      "Meanwhile pound the chillies, garlic and a pinch of salt into a rough sambal paste.",
      "Fry the sambal paste in a spoonful of the tempeh oil for 2 minutes, add the chopped tomato and tamarind liquor, and cook 3–4 minutes into a thick, fiery sauce.",
      "Serve the crisp tempeh with the sambal spooned over or alongside for tearing and dipping.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-id-ikan-bakar",
    name: { en: "Ikan Bakar (Grilled Fish with Sambal)", hindi: "इकान बकर" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175119", grams: 340 }, // mackerel
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-167763", grams: 20 }, // tamarind
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-167746", grams: 40 }, // lemon, to serve
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pound the chillies, garlic, turmeric and salt into a sambal paste; stir in the tamarind liquor.",
      "Score the mackerel and rub half the sambal into the cuts and cavity; marinate 20 minutes.",
      "Grill over high heat for 5–6 minutes per side, basting with the remaining sambal, until the skin chars in patches and the flesh flakes — ikan bakar should taste of fire.",
      "Rest 2 minutes so the juices settle.",
      "Serve with lemon wedges, the sambal glaze dark and sticky on the crisped skin.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-sayur-lodeh",
    name: { en: "Sayur Lodeh with Tofu & Tempeh", hindi: "सायुर लोदेह" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-174272", grams: 200 }, // tempeh
      { foodId: "usda-172448", grams: 200 }, // tofu, firm
      { foodId: "usda-170172", grams: 250 }, // coconut milk
      { foodId: "usda-2346400", grams: 100 }, // green beans
      { foodId: "usda-2685577", grams: 150 }, // eggplant
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the tempeh and tofu into chunky cubes and the vegetables into bite-size pieces.",
      "Pound the chilli, garlic and turmeric into a paste and fry in a little of the coconut milk's thick top for 2 minutes until fragrant.",
      "Add the coconut milk and about 200 ml water; bring to a gentle simmer — never a hard boil, or the coconut milk splits.",
      "Add the carrot, beans and eggplant and simmer 6 minutes.",
      "Add the tempeh and tofu and simmer 5 minutes more, until the vegetables are tender and the broth is golden and rich.",
      "Season with salt and serve over rice, the broth soaking in.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-opor-ayam",
    name: { en: "Opor Ayam (Coconut Chicken Curry)", hindi: "ओपोर आयम" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // chicken thigh
      { foodId: "usda-170172", grams: 400 }, // coconut milk
      { foodId: "usda-170922", grams: 6 }, // coriander seed, ground
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-1104647", grams: 20 }, // garlic
      { foodId: "usda-169231", grams: 20 }, // ginger
      { foodId: "usda-172231", grams: 3 }, // turmeric
      { foodId: "usda-170917", grams: 2 }, // bay leaf
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Pound the garlic, ginger, coriander, cumin and turmeric into a smooth paste.",
      "Fry the paste in the thick top of the coconut milk for 3 minutes until fragrant and the oil begins to separate.",
      "Add the chicken and turn until coated and sealed.",
      "Pour in the remaining coconut milk and about 200 ml water, add the bay leaf, and simmer gently for 20 minutes — opor is a pale, gentle curry; keep it below a hard boil.",
      "Season with salt; the sauce should be ivory, rich and warmly spiced rather than hot.",
      "Rest 5 minutes and serve over rice.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-nasi-goreng",
    name: { en: "Nasi Goreng with Shrimp & Egg", hindi: "नासी गोरेंग" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 180 }, // white rice, dry
      { foodId: "usda-175179", grams: 180 }, // shrimp (prawns)
      { foodId: "usda-171287", grams: 120 }, // egg, whole
      { foodId: "usda-2346407", grams: 100 }, // cabbage, shredded
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-334247", grams: 6 }, // sugar, for the sweet-salty balance
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the rice and cool it completely, spread on a tray — nasi goreng is a dish for cold rice.",
      "Pound the chilli and garlic into a paste and fry in the hot oil for 30 seconds until fragrant.",
      "Add the shrimp and stir-fry 1 minute until just pink; lift out.",
      "Add the cold rice and cabbage and toss over the highest heat for 3–4 minutes, letting some grains catch and toast at the edges.",
      "Season with salt and the sugar — nasi goreng balances sweet against salty — and return the shrimp.",
      "Meanwhile fry the eggs sunny-side up in a separate pan until the whites are crisp at the edges and the yolks runny.",
      "Serve the rice crowned with a fried egg each.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-sambal-telur",
    name: { en: "Sambal Telur (Eggs in Sambal)", hindi: "संबल तेलुर" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 420 }, // egg, whole, boiled
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-167763", grams: 10 }, // tamarind
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Boil the eggs for 9 minutes, cool, peel, and prick them lightly all over so the sambal can cling and season them.",
      "Fry the peeled eggs in the oil, turning, until their whites blister and turn golden in patches; lift out.",
      "Pound the chillies, garlic and onion into a rough paste and fry it in the same oil for 3 minutes until it darkens and the raw smell cooks out.",
      "Add the chopped tomatoes, tamarind liquor and salt; cook 5 minutes into a thick, fiery sauce.",
      "Return the eggs to the sauce and simmer 3 minutes, spooning the sambal over them.",
      "Serve with rice, the eggs glossy red and the sauce hot, sour and sweet at once.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-mie-goreng",
    name: { en: "Mie Goreng (Indonesian Fried Noodles)", hindi: "मी गोरेंग" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168893", grams: 150 }, // whole wheat flour, for noodles
      { foodId: "usda-2646170", grams: 220 }, // chicken breast
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-2346407", grams: 120 }, // cabbage
      { foodId: "usda-2258586", grams: 80 }, // carrots
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-334247", grams: 8 }, // sugar, for the sweet glaze
      { foodId: "usda-170106", grams: 8 }, // red hot chilli
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Knead the flour with about 75 ml water and a pinch of the salt into a firm dough; rest 20 minutes, roll thin and cut into noodles; boil 3 minutes and drain.",
      "Slice the chicken thinly and season with salt; shred the cabbage and julienne the carrots.",
      "Heat a wok until smoking, add the oil, and sear the chicken until just cooked; lift out.",
      "Scramble the eggs in the same wok into ribbons and lift out with the chicken.",
      "Stir-fry the cabbage, carrot, garlic and chilli for 1 minute; add the noodles and toss over high heat.",
      "Season with the remaining salt and the sugar and toss for 2 minutes until the noodles are glossy and lightly caramelised at the edges; return the chicken and egg, toss once, and serve.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-id-spiced-baked-fish",
    name: { en: "Indonesian Spiced Baked Fish", hindi: "मसालेदार बेक्ड मछली" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 340 }, // tilapia
      { foodId: "usda-172231", grams: 4 }, // turmeric
      { foodId: "usda-170106", grams: 12 }, // red hot chilli
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169231", grams: 15 }, // ginger
      { foodId: "usda-167763", grams: 15 }, // tamarind
      { foodId: "usda-170172", grams: 60 }, // coconut milk
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Pound the chillies, garlic, ginger and turmeric with the salt into a thick spice paste; stir in the tamarind liquor and coconut milk.",
      "Score the fish and coat it thoroughly in the spice paste, working it into the cuts; marinate 30 minutes.",
      "Lay the fish in a baking dish with all its marinade.",
      "Bake in a hot oven (220°C) for 15–18 minutes, basting once, until the paste darkens at the edges and the flesh flakes — this is pepes-style spiced fish, baked in a dish instead of its banana-leaf parcel.",
      "Rest 3 minutes and serve with the spiced juices spooned over.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  /* ------------------------------- American ------------------------------ */
  {
    id: "dish-us-turkey-chilli",
    name: { en: "Turkey Chilli", hindi: "टर्की चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-175193", grams: 150 }, // kidney beans, dry
      { foodId: "usda-173734", grams: 100 }, // black beans, dry
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-171319", grams: 12 }, // chili powder
      { foodId: "usda-170923", grams: 4 }, // cumin seed, ground
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the kidney and black beans overnight, then boil them in fresh water until tender, about 45 minutes; drain, keeping a cup of the cooking liquid.",
      "Brown the turkey in a large pot over high heat, breaking it into crumbles, until it loses its raw colour and starts to catch at the edges.",
      "Add the onion and pepper and cook 5 minutes until softened; add the garlic, chili powder and cumin and fry 1 minute until the spices smell toasted.",
      "Add the chopped tomatoes and their juice, the beans and a splash of bean liquid; season with salt.",
      "Simmer, partially covered, for 30 minutes, stirring now and then, until thick enough that a spoon leaves a trail.",
      "Rest 10 minutes — chilli improves as it sits — and serve with rice or bread.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-white-chicken-chilli",
    name: { en: "White Chicken Chilli", hindi: "सफेद चिकन चिली" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-173745", grams: 180 }, // navy beans, dry
      { foodId: "usda-2710826", grams: 200 }, // corn kernels
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 100 }, // green sweet pepper
      { foodId: "usda-170923", grams: 4 }, // cumin seed, ground
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Soak the navy beans overnight, then boil in fresh water until tender, about 40 minutes; drain, keeping the cooking liquid.",
      "Poach the chicken in about 800 ml water for 12 minutes; lift out, shred, and keep the poaching liquid.",
      "Soften the onion and pepper in a little oil in the same pot; add the garlic and cumin and fry 1 minute.",
      "Add the beans, corn, shredded chicken and enough of the two cooking liquids to make a thick, soupy chilli.",
      "Simmer 15 minutes, lightly mashing a ladleful of beans against the side to thicken the broth.",
      "Season with salt and serve steaming — pale, creamy and warming rather than fiery.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-salmon-cakes",
    name: { en: "Salmon Cakes", hindi: "सैल्मन केक" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 300 }, // salmon
      { foodId: "usda-171287", grams: 60 }, // egg, whole, binder
      { foodId: "usda-168936", grams: 40 }, // wheat flour
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171413", grams: 12 }, // olive oil, for frying
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the salmon until just done (poach or bake for 10 minutes), cool, and flake it with a fork, discarding skin and bones.",
      "Combine the flaked salmon with the egg, flour, onion, salt and a squeeze of lemon; mix gently — the cakes should hold together but stay coarse.",
      "Chill the mixture for 15 minutes so the cakes shape cleanly.",
      "Shape into 4 thick patties with wet hands.",
      "Fry in the olive oil over medium heat for 3–4 minutes per side until deep golden and crisp, with the centre still moist.",
      "Serve with lemon wedges.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-yogurt-tuna-salad",
    name: { en: "Tuna Salad with Greek Yogurt", hindi: "टूना सलाद" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 220 }, // tuna, canned in water, drained
      { foodId: "usda-330137", grams: 120 }, // Greek yogurt
      { foodId: "usda-2346406", grams: 100 }, // cucumber, diced
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-170931", grams: 2 }, // black pepper
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Drain the tuna thoroughly and flake it into a bowl in large chunks — press out the water well or the salad will weep.",
      "Soak the diced onion in cold water for 5 minutes to soften its bite; drain and pat dry.",
      "Fold the tuna with the Greek yogurt, cucumber and onion — the yogurt stands in for mayonnaise, lighter and tangier.",
      "Season with lemon juice, salt and plenty of black pepper; taste and adjust the lemon.",
      "Rest 10 minutes in the fridge so the flavours settle.",
      "Serve piled on bread, in lettuce-style cabbage leaves, or over rice.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-breakfast-burrito",
    name: { en: "Breakfast Burrito", hindi: "नाश्ता बरिटो" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 120 }, // wheat flour, for tortillas
      { foodId: "usda-171287", grams: 240 }, // egg, whole
      { foodId: "usda-173734", grams: 80 }, // black beans, dry, cooked
      { foodId: "usda-328637", grams: 50 }, // cheddar
      { foodId: "usda-170108", grams: 80 }, // red sweet pepper
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-171025", grams: 10 }, // sunflower oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the black beans until tender (soaked overnight, about 40 minutes); season with salt and keep warm.",
      "Make the tortillas: knead the flour with about 70 ml warm water and a pinch of salt into a soft dough; rest 20 minutes, divide in two, roll into large thin rounds and cook on a dry hot pan for 1 minute per side until blistered in spots. Wrap in a cloth to keep soft.",
      "Stir-fry the onion and pepper in the oil until softened and sweet.",
      "Add the eggs, beaten with the remaining salt, and scramble slowly into large soft curds with the vegetables.",
      "Lay the eggs down the centre of each warm tortilla, spoon the black beans alongside, and shower with grated cheddar.",
      "Fold in the sides, roll up tightly, and toast seam-side down in the hot pan for 1 minute to seal. Serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-us-turkey-burgers",
    name: { en: "Turkey Burgers with Cheddar & Slaw", hindi: "टर्की बर्गर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-328637", grams: 80 }, // cheddar
      { foodId: "usda-2346396", grams: 40 }, // oats, binder
      { foodId: "usda-171287", grams: 60 }, // egg, whole, binder
      { foodId: "usda-2346407", grams: 200 }, // cabbage, for slaw
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt, for slaw
      { foodId: "usda-167746", grams: 30 }, // lemon, for slaw
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Mix the turkey with the oats, egg, half the salt and the pepper until just combined; rest 10 minutes so the oats hydrate — they keep the burgers juicy.",
      "Shape into 4 thick patties with a shallow dent in the centre of each.",
      "Make the slaw: shred the cabbage finely and toss with the Greek yogurt, lemon juice and the remaining salt; rest so it wilts slightly.",
      "Grill or pan-fry the patties for 5–6 minutes per side until cooked through with a good crust — turkey must be cooked through, but not a minute past.",
      "Lay the cheddar over the patties for the last minute and cover so it melts.",
      "Rest 3 minutes and serve the burgers with the slaw piled on or alongside.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-bbq-chicken",
    name: { en: "BBQ Chicken with Homemade Sauce", hindi: "बार्बेक्यू चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 700 }, // chicken thigh
      { foodId: "usda-170457", grams: 300 }, // tomatoes, for the sauce
      { foodId: "usda-334247", grams: 25 }, // sugar
      { foodId: "usda-173469", grams: 30 }, // cider vinegar
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-170929", grams: 3 }, // mustard seed, ground
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-790646", grams: 100 }, // onion, grated into the sauce
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Make the sauce: blend the tomatoes with the onion and garlic, then simmer with the sugar, vinegar, chili powder, mustard and half the salt for 15 minutes until thick, dark and glossy — a barbecue sauce built from scratch, sweet first, then tangy, then warm.",
      "Season the chicken with the remaining salt and grill or roast for 15 minutes until nearly cooked.",
      "Brush the chicken generously with the sauce and return to the heat for 5 minutes; brush again and cook 3–4 minutes more until the sauce lacquers and chars at the edges.",
      "Rest 5 minutes so the juices settle under the glaze.",
      "Serve with the remaining warm sauce alongside.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-salmon-chowder",
    name: { en: "Salmon & Corn Chowder", hindi: "सैल्मन चाउडर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 450 }, // salmon
      { foodId: "usda-2346401", grams: 400 }, // potato, diced
      { foodId: "usda-2710826", grams: 250 }, // corn kernels
      { foodId: "usda-322892", grams: 400 }, // milk, whole
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-173410", grams: 20 }, // butter
      { foodId: "usda-173468", grams: 5 }, // salt
      { foodId: "usda-170931", grams: 2 }, // black pepper
    ],
    method: [
      "Melt the butter and soften the onion for 5 minutes without colouring it.",
      "Add the diced potato and about 500 ml water; simmer 10 minutes until the potato is nearly tender.",
      "Pour in the milk and add the corn; simmer gently for 5 minutes — never boil milk hard, or the chowder turns grainy.",
      "Cut the salmon into large chunks, season with salt and pepper, and slide them into the chowder.",
      "Poach on the lowest heat for 4–5 minutes until the salmon is just opaque and flakes.",
      "Rest 3 minutes and serve in warm bowls, the broth creamy and the salmon in generous flakes.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-cod-cakes",
    name: { en: "New England Cod Cakes", hindi: "कॉड केक" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684444", grams: 300 }, // cod
      { foodId: "usda-2346401", grams: 250 }, // potato
      { foodId: "usda-171287", grams: 60 }, // egg, whole, binder
      { foodId: "usda-168936", grams: 30 }, // wheat flour
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-171413", grams: 12 }, // olive oil, for frying
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Boil the potato until tender; drain and mash roughly while hot, then cool.",
      "Poach the cod in salted water for 8 minutes until it flakes; drain very well and flake, discarding skin and bones.",
      "Combine the cod, potato, egg, onion and salt, mixing gently so the fish stays in flakes, not paste.",
      "Shape into 4 thick cakes and dust lightly with flour; chill 15 minutes so they hold in the pan.",
      "Fry in the olive oil over medium heat for 3–4 minutes per side until deep golden and crisp.",
      "Serve with lemon wedges — the centre should be soft, flaky and steaming.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-chicken-pot-pie",
    name: { en: "Chicken Pot Pie", hindi: "चिकन पॉट पाई" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-168936", grams: 200 }, // wheat flour, for the crust
      { foodId: "usda-173410", grams: 60 }, // butter
      { foodId: "usda-322892", grams: 250 }, // milk, whole
      { foodId: "usda-170419", grams: 150 }, // peas, green
      { foodId: "usda-2258586", grams: 150 }, // carrots, diced
      { foodId: "usda-2346401", grams: 200 }, // potato, diced
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Make the crust: rub the butter into the flour and half the salt until it resembles coarse crumbs; bring together with just enough cold water into a dough, wrap and chill 30 minutes.",
      "Poach the chicken in about 600 ml water for 12 minutes; lift out, dice, and keep the broth.",
      "Soften the onion, carrot and potato in a little of the poaching fat for 5 minutes; stir in 2 spoonfuls of flour from the measured amount and cook 1 minute.",
      "Pour in the broth and milk, stirring, and simmer into a thick, creamy sauce; fold in the chicken and peas and season with the remaining salt.",
      "Fill a pie dish with the chicken mixture, roll out the crust and lay it over, crimping the edges and cutting a vent.",
      "Bake at 200°C for 25–30 minutes until the crust is deep golden and the filling bubbles at the vent. Rest 10 minutes before serving.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-turkey-meatloaf",
    name: { en: "Turkey Meatloaf", hindi: "टर्की मीटलोफ" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 650 }, // ground turkey
      { foodId: "usda-2346396", grams: 80 }, // oats
      { foodId: "usda-171287", grams: 100 }, // egg, whole
      { foodId: "usda-790646", grams: 120 }, // onion, finely diced
      { foodId: "usda-170457", grams: 150 }, // tomato, for the glaze
      { foodId: "usda-334247", grams: 10 }, // sugar, for the glaze
      { foodId: "usda-173469", grams: 10 }, // cider vinegar, for the glaze
      { foodId: "usda-322892", grams: 60 }, // milk, whole
      { foodId: "usda-173468", grams: 6 }, // salt
      { foodId: "usda-170931", grams: 3 }, // black pepper
    ],
    method: [
      "Soak the oats in the milk for 10 minutes; blend the tomato with the sugar and vinegar into a glaze and simmer 5 minutes until slightly thick.",
      "Combine the turkey, soaked oats, eggs, onion, salt and pepper; mix just until it holds — overmixing makes meatloaf dense.",
      "Shape into a loaf in a baking dish, smoothing the top.",
      "Bake at 180°C for 35 minutes.",
      "Brush the top generously with the tomato glaze and bake 12–15 minutes more, until the glaze is sticky and the loaf is cooked through.",
      "Rest 10 minutes before slicing — the slices should be moist and hold together cleanly.",
    ],
    timeMinutes: 70,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-shrimp-grits",
    name: { en: "Shrimp & Grits", hindi: "झींगा ग्रिट्स" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-168867", grams: 120 }, // cornmeal, for grits
      { foodId: "usda-328637", grams: 40 }, // cheddar
      { foodId: "usda-173410", grams: 25 }, // butter
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170932", grams: 2 }, // cayenne
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Make the grits: whisk the cornmeal into about 600 ml boiling salted water, lower the heat, and cook 20 minutes, stirring often, until thick and creamy like soft polenta.",
      "Stir half the butter and the grated cheddar into the grits; keep warm — they should be loose and spoonable.",
      "Season the shrimp with salt and cayenne.",
      "Sear the shrimp in a smoking pan with the remaining butter and the garlic for 1 minute per side until pink and just cooked, the butter turning nutty.",
      "Spoon the grits into warm bowls and top with the shrimp and every drop of the garlic butter.",
      "Serve at once — grits wait for no one and firm up fast.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-jambalaya",
    name: { en: "Chicken & Shrimp Jambalaya", hindi: "जंबालया" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 450 }, // chicken thigh
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-2512381", grams: 300 }, // white rice, dry
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-171319", grams: 8 }, // chili powder
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-171410", grams: 12 }, // peanut oil
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Brown the chicken pieces in the oil in a heavy pot until well coloured; lift out.",
      "In the same pot, cook the onion and pepper in the chicken fat for 5 minutes until soft and sweet; add the garlic and chili powder for 1 minute.",
      "Add the tomatoes and cook 3 minutes, scraping up the browned bits — they are the jambalaya's base flavour.",
      "Stir in the rice and about 600 ml water, season with salt, and return the chicken.",
      "Cover and cook on the lowest heat for 18 minutes without lifting the lid.",
      "Lay the shrimp over the rice, cover again and cook 4 minutes until they turn pink; rest 10 minutes, then fluff and serve.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-chicken-gumbo",
    name: { en: "Chicken & Shrimp Gumbo", hindi: "चिकन गंबो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 450 }, // chicken thigh
      { foodId: "usda-175179", grams: 250 }, // shrimp (prawns)
      { foodId: "usda-169260", grams: 250 }, // okra, sliced
      { foodId: "usda-168936", grams: 50 }, // wheat flour, for the roux
      { foodId: "usda-171411", grams: 40 }, // soybean oil, for the roux
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2512381", grams: 200 }, // white rice, dry, to serve
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170932", grams: 3 }, // cayenne
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Make the roux: heat the oil in a heavy pot, whisk in the flour, and cook over medium heat, stirring constantly, for 12–15 minutes until it turns the colour of dark copper — a gumbo roux is not rushed, and it must never stop moving.",
      "Add the onion and pepper straight into the roux to stop it darkening further; cook 5 minutes, then add the garlic and cayenne.",
      "Pour in about 900 ml water gradually, whisking, and add the tomatoes and okra; simmer 15 minutes — the okra's silk thickens the gumbo as it cooks.",
      "Add the chicken pieces and simmer 15 minutes until tender.",
      "Add the shrimp and cook 3 minutes until just pink; season with salt.",
      "Serve the gumbo ladled over bowls of cooked rice.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-eggs-royale",
    name: { en: "Eggs Royale (Salmon Benedict)", hindi: "एग्स रॉयल" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684441", grams: 160 }, // salmon
      { foodId: "usda-171287", grams: 200 }, // egg, whole, for poaching
      { foodId: "usda-172184", grams: 40 }, // egg yolk, for hollandaise
      { foodId: "usda-173410", grams: 30 }, // butter, for hollandaise
      { foodId: "usda-168936", grams: 100 }, // wheat flour, for muffins
      { foodId: "usda-322892", grams: 60 }, // milk, whole, for muffins
      { foodId: "usda-168933", grams: 10 }, // semolina, for dusting muffins
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make quick English muffins: stir the flour, milk and a pinch of salt into a soft dough, rest 15 minutes, roll thick, cut 4 rounds, dust with semolina and cook on a dry griddle for 5 minutes per side until puffed and golden. Split and toast.",
      "Make the hollandaise: whisk the yolks with the lemon juice over a pan of barely simmering water until pale and ribbon-thick; whisk in the melted butter in a slow stream until glossy; season with salt and keep warm — never hot, or it splits.",
      "Poach the eggs in barely simmering water for 3 minutes, until the whites are set and the yolks run; drain on a cloth.",
      "Sear the salmon slices briefly in a hot pan, 1 minute per side, just to warm and colour them.",
      "Build each plate: a toasted muffin, a slice of salmon, a poached egg, and a generous spoonful of hollandaise.",
      "Serve immediately — this dish is an assembly of hot, warm and runny, and waits for no one.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-southwest-scramble",
    name: { en: "Southwest Egg & Black Bean Scramble", hindi: "दक्षिण-पश्चिम अंडा स्क्रैंबल" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 300 }, // egg, whole
      { foodId: "usda-173734", grams: 70 }, // black beans, dry, cooked
      { foodId: "usda-328637", grams: 40 }, // cheddar
      { foodId: "usda-170108", grams: 80 }, // red sweet pepper
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seed, ground
      { foodId: "usda-171025", grams: 8 }, // sunflower oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cook the black beans until tender (soaked overnight, about 40 minutes); drain and season with the cumin and half the salt.",
      "Stir-fry the onion and pepper in the oil until softened and sweet at the edges.",
      "Add the beans to the pan and warm through for 1 minute.",
      "Pour in the eggs, beaten with the remaining salt, and scramble slowly over medium-low heat into large, soft curds that just hold the beans and peppers.",
      "Take off the heat while still glossy, shower with grated cheddar, and cover for 30 seconds so the cheese melts into the curds.",
      "Serve at once, straight from the pan.",
    ],
    timeMinutes: 25,
    budgetTier: 2,
    enriched: true,
    enrichment: "Black beans and cheddar added to the classic pepper-and-onion scramble.",
  },
  {
    id: "dish-us-tuna-noodle-casserole",
    name: { en: "Tuna Noodle Casserole", hindi: "टूना नूडल कैसरोल" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-334194", grams: 300 }, // tuna, canned in water, drained
      { foodId: "usda-168893", grams: 220 }, // whole wheat flour, for noodles
      { foodId: "usda-322892", grams: 300 }, // milk, whole
      { foodId: "usda-170419", grams: 150 }, // peas, green
      { foodId: "usda-328637", grams: 60 }, // cheddar
      { foodId: "usda-1750347", grams: 150 }, // mushrooms
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Make the noodles: knead the flour with about 110 ml water and a pinch of salt into a firm dough; rest 20 minutes, roll thin, cut into ribbons and boil 3–4 minutes; drain.",
      "Soften the onion and mushrooms in a little oil until the mushrooms brown; stir in 2 spoonfuls of flour from the noodle offcuts if any remain, or a spoonful of extra flour, and cook 1 minute.",
      "Pour in the milk, stirring, and simmer into a creamy sauce; season with the remaining salt.",
      "Fold the noodles, drained tuna (in large flakes) and peas through the sauce.",
      "Tip into a baking dish, top with the grated cheddar, and bake at 190°C for 15–18 minutes until bubbling and golden on top.",
      "Rest 5 minutes before serving — the sauce sets slightly as it stands.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-chicken-dumplings",
    name: { en: "Chicken & Dumplings", hindi: "चिकन डंपलिंग्स" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 550 }, // chicken thigh
      { foodId: "usda-168936", grams: 200 }, // wheat flour, for dumplings
      { foodId: "usda-322892", grams: 150 }, // milk, whole, for dumplings
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-170419", grams: 100 }, // peas, green
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-173410", grams: 30 }, // butter
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken in about 1 litre of water for 15 minutes; lift out, shred coarsely, and keep the broth.",
      "Soften the onion and carrot in the butter in the same pot; pour the broth back in and simmer 5 minutes.",
      "Make the dumpling dough: stir the flour, milk and half the salt into a soft, sticky dough — do not knead it, or the dumplings turn tough.",
      "Season the broth with the remaining salt, return the chicken and add the peas; bring to the barest simmer.",
      "Drop heaped teaspoons of dough onto the surface of the stew, cover tightly, and cook 12 minutes without lifting the lid — the dumplings steam, they do not boil.",
      "Serve at once, the dumplings puffed and tender over the creamy chicken stew.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-buffalo-chicken",
    name: { en: "Buffalo Chicken with Yogurt Dip", hindi: "बफ़ेलो चिकन" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 320 }, // chicken breast
      { foodId: "usda-170932", grams: 4 }, // cayenne, for the sauce
      { foodId: "usda-173469", grams: 20 }, // cider vinegar, for the sauce
      { foodId: "usda-173410", grams: 20 }, // butter, for the sauce
      { foodId: "usda-330137", grams: 100 }, // Greek yogurt, for the dip
      { foodId: "usda-1104647", grams: 6 }, // garlic
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Cut the chicken into thick strips and season with salt; grill or sear in a hot pan for 4–5 minutes per side until cooked through with charred edges.",
      "Make buffalo sauce the original way: melt the butter, take it off the heat, and whisk in the cayenne, vinegar, garlic and a pinch of salt — it should be fiery, tangy and glossy.",
      "Toss the hot chicken strips through the sauce until every piece is coated red.",
      "Stir the Greek yogurt with a pinch of salt into a cool dip.",
      "Serve the buffalo chicken at once with the yogurt dip alongside — the contrast of fire and cool is the dish.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-us-denver-omelette",
    name: { en: "Denver-Style Turkey Omelette", hindi: "डेनवर ऑमलेट" },
    category: "breakfast",
    servings: 1,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 200 }, // egg, whole
      { foodId: "usda-2514747", grams: 60 }, // ground turkey
      { foodId: "usda-328637", grams: 30 }, // cheddar
      { foodId: "usda-170427", grams: 60 }, // green sweet pepper, diced
      { foodId: "usda-790646", grams: 50 }, // onion, diced
      { foodId: "usda-173410", grams: 8 }, // butter
      { foodId: "usda-173468", grams: 2 }, // salt
    ],
    method: [
      "Brown the ground turkey in a dry pan, breaking it into small crumbles; lift out.",
      "In the same pan, melt the butter and soften the onion and pepper for 3 minutes until sweet but still bright.",
      "Return the turkey to the pan and spread everything evenly.",
      "Pour in the eggs, beaten with the salt, tilting the pan so they run into every gap; as the edges set, lift them and let the liquid egg flow underneath.",
      "When the top is just set but still glossy, scatter the cheddar over one half and fold the omelette over it.",
      "Slide onto a warm plate and rest 1 minute so the cheese melts; serve at once.",
    ],
    timeMinutes: 15,
    budgetTier: 3,
    enriched: false,
  },
  /* ---------------------------- Mexican / Latin ---------------------------- */
  {
    id: "dish-mx-chicken-tinga",
    name: { en: "Chicken Tinga", hindi: "चिकन टिंगा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-170457", grams: 400 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion, half sliced, half for the sauce
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken in salted water for 12–14 minutes until just cooked; reserve the broth, and shred the chicken finely by hand.",
      "Blend the tomatoes with half the onion, the garlic and the chillies into a smooth sauce.",
      "Fry the remaining sliced onion in the oil until soft and golden at the edges.",
      "Pour in the tomato sauce and fry it, stirring, for 5 minutes until it darkens and thickens — tinga's sauce is fried, not just boiled.",
      "Add the shredded chicken and a ladle of its broth; simmer 8 minutes so the chicken drinks the sauce.",
      "Season with salt and cumin; serve on tortillas or rice, the chicken in fine, saucy strands.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-chicken-burrito-bowl",
    name: { en: "Chicken Burrito Bowl", hindi: "चिकन बरिटो कटोरा" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 280 }, // chicken breast
      { foodId: "usda-2512381", grams: 140 }, // white rice, dry
      { foodId: "usda-173734", grams: 80 }, // black beans, dry, cooked
      { foodId: "usda-2710826", grams: 100 }, // corn kernels
      { foodId: "usda-171705", grams: 100 }, // avocado
      { foodId: "usda-170457", grams: 100 }, // tomato, diced
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-169997", grams: 10 }, // coriander leaves
      { foodId: "usda-171319", grams: 4 }, // chili powder, for the chicken
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the black beans until tender (soaked overnight, about 40 minutes) and season with salt; cook the rice and keep warm.",
      "Rub the chicken with the chili powder and salt; grill or sear for 5–6 minutes per side until charred at the edges and cooked through; rest, then slice.",
      "Char the corn in a dry hot pan until it blisters in spots.",
      "Season the diced tomato with a pinch of salt and the coriander.",
      "Build the bowls: rice first, then the beans, corn, tomato and sliced chicken in separate sections.",
      "Top with sliced avocado and a generous squeeze of lemon; serve with the sections mixed at the table.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-chicken-tacos-pastor",
    name: { en: "Chicken Tacos al Pastor", hindi: "टाकोस अल पास्टर" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-169124", grams: 200 }, // pineapple, half for marinade, half diced
      { foodId: "usda-168867", grams: 200 }, // cornmeal, for tortillas
      { foodId: "usda-790646", grams: 150 }, // onion, diced
      { foodId: "usda-171319", grams: 10 }, // chili powder
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-173469", grams: 15 }, // cider vinegar, for the marinade
      { foodId: "usda-169997", grams: 15 }, // coriander leaves
      { foodId: "usda-171410", grams: 10 }, // peanut oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blend half the pineapple with the chili powder, cumin, vinegar, salt and a splash of water into the pastor marinade; coat the chicken and marinate at least 1 hour.",
      "Make the tortillas: mix the cornmeal with warm water and a pinch of salt into a soft dough, rest 15 minutes, press or roll into small thin rounds and cook on a dry hot pan 1 minute per side until they puff in spots. Keep wrapped and warm.",
      "Grill or sear the chicken over high heat until charred at the edges and cooked through; rest, then slice thinly.",
      "Char the remaining diced pineapple in the hot pan until caramelised at the edges.",
      "Warm the tortillas once more, then fill each with chicken, charred pineapple, diced onion and coriander.",
      "Serve at once, two or three tacos to a plate, with lemon if you have it.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-huevos-rancheros",
    name: { en: "Huevos Rancheros", hindi: "हुएवोस रैंचेरोस" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-171287", grams: 240 }, // egg, whole
      { foodId: "usda-173734", grams: 90 }, // black beans, dry, cooked
      { foodId: "usda-168867", grams: 90 }, // cornmeal, for tortillas
      { foodId: "usda-170457", grams: 200 }, // tomatoes, for salsa
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the black beans until tender (soaked overnight, about 40 minutes); mash a third of them roughly and stir back in with their salt, keeping them loose and saucy.",
      "Make the tortillas from the cornmeal, warm water and a pinch of salt; cook on a dry hot pan and keep warm.",
      "Make the salsa ranchera: fry the onion and chilli in the oil, add the chopped tomatoes and salt, and cook 6–8 minutes into a loose, fiery sauce.",
      "Fry the eggs in a little oil until the whites are set and crisp at the edges and the yolks still run.",
      "Lay two warm tortillas on each plate, spoon the beans over them, and set a fried egg on top.",
      "Spoon the hot salsa over the eggs, scatter coriander, and serve at once.",
    ],
    timeMinutes: 40,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-mx-chilaquiles",
    name: { en: "Chilaquiles with Chicken & Egg", hindi: "चिलाकिलेस" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 120 }, // cornmeal, for tortillas
      { foodId: "usda-171287", grams: 200 }, // egg, whole
      { foodId: "usda-2646170", grams: 150 }, // chicken breast, poached and shredded
      { foodId: "usda-170457", grams: 250 }, // tomatoes, for salsa
      { foodId: "usda-790646", grams: 80 }, // onion
      { foodId: "usda-329370", grams: 40 }, // mozzarella
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Make tortillas from the cornmeal, warm water and a pinch of salt; cut them into triangles and toast or fry them in the oil until crisp chips — yesterday's tortillas are the classic choice.",
      "Poach the chicken for 10 minutes and shred it.",
      "Make the salsa: fry the onion and chilli, add the tomatoes and salt, and simmer 6 minutes into a loose sauce; blend roughly if you like it smooth.",
      "Bring the salsa to a simmer in a wide pan and fold in the tortilla chips; cook 2 minutes, until the chips soften at the edges but still hold a bite in the centre — chilaquiles are sauced, never soggy.",
      "Fold in the shredded chicken and warm through.",
      "Top with fried or scrambled eggs, scatter the mozzarella, and serve at once straight from the pan.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-chicken-enchiladas",
    name: { en: "Chicken Enchiladas Rojas", hindi: "चिकन एनचिलाडास" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-168867", grams: 220 }, // cornmeal, for tortillas
      { foodId: "usda-170457", grams: 400 }, // tomatoes, for the red sauce
      { foodId: "usda-329370", grams: 100 }, // mozzarella
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170106", grams: 15 }, // red hot chilli
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-171411", grams: 12 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken for 12 minutes; shred it finely and season with salt.",
      "Make the tortillas from the cornmeal, warm water and a pinch of salt; cook them soft on a dry pan and keep wrapped — enchilada tortillas stay pliable, not crisp.",
      "Make the salsa roja: fry the onion, garlic and chillies in the oil, add the tomatoes, cumin and salt, and simmer 8 minutes; blend smooth and keep hot.",
      "Dip each tortilla briefly in the hot sauce to soften and stain it red, then fill with chicken, roll, and lay seam-down in a baking dish.",
      "Spoon the remaining sauce over the rolls and scatter the mozzarella.",
      "Bake at 200°C for 12–15 minutes until the cheese melts and bubbles at the edges. Rest 5 minutes and serve.",
    ],
    timeMinutes: 50,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-chicken-quesadillas",
    name: { en: "Chicken & Cheese Quesadillas", hindi: "चिकन क्वेसाडिला" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 140 }, // wheat flour, for tortillas
      { foodId: "usda-2646170", grams: 240 }, // chicken breast
      { foodId: "usda-329370", grams: 80 }, // mozzarella
      { foodId: "usda-170427", grams: 80 }, // green sweet pepper
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-171411", grams: 8 }, // soybean oil
      { foodId: "usda-173468", grams: 3 }, // salt
    ],
    method: [
      "Make the tortillas: knead the flour with warm water and a pinch of salt into a soft dough; rest 20 minutes, roll into 2 large thin rounds and cook on a dry hot pan until blistered in spots. Keep soft.",
      "Season the chicken with salt and sear until cooked through and golden; rest, then slice thinly.",
      "Stir-fry the onion and pepper until softened and sweet.",
      "Lay a tortilla in a dry hot pan; cover half with mozzarella, chicken slices and the pepper-onion mixture, then fold.",
      "Cook 2 minutes per side, pressing gently, until the tortilla is crisp and spotted and the cheese pulls in strings.",
      "Rest 1 minute, cut into wedges, and serve at once.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-bean-cheese-burritos",
    name: { en: "Black Bean & Cheese Burritos", hindi: "काली बीन बरिटो" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 140 }, // wheat flour, for tortillas
      { foodId: "usda-173734", grams: 140 }, // black beans, dry
      { foodId: "usda-2512381", grams: 80 }, // white rice, dry
      { foodId: "usda-328637", grams: 60 }, // cheddar
      { foodId: "usda-170457", grams: 100 }, // tomato, diced
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170923", grams: 2 }, // cumin seed, ground
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the black beans until completely tender (soaked overnight, about 40 minutes); season with the cumin and salt and mash a third of them into the rest for a creamy bite. Cook the rice.",
      "Make 2 large flour tortillas from the flour, warm water and a pinch of salt; cook on a dry pan until blistered and keep them soft and warm.",
      "Stir-fry the onion until soft and sweet; season the diced tomato with a pinch of salt.",
      "Lay rice down the centre of each tortilla, spoon the beans over, and add the onion, tomato and grated cheddar.",
      "Fold in the sides and roll up tightly, tucking as you go.",
      "Toast the burritos seam-side down in a dry hot pan for 1–2 minutes to seal and crisp, and serve at once.",
    ],
    timeMinutes: 45,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-mx-pollo-guisado",
    name: { en: "Pollo Guisado (Braised Chicken)", hindi: "पोलो गुइसाडो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 650 }, // chicken thigh
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-2346401", grams: 300 }, // potato, in chunks
      { foodId: "usda-2258586", grams: 150 }, // carrots
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Season the chicken with salt and brown it in the oil in a heavy pot until golden on all sides; lift out.",
      "Soften the onion and pepper in the same pot; add the garlic and tomatoes and cook 4 minutes into a loose sofrito.",
      "Return the chicken with about 300 ml water; bring to a simmer.",
      "Add the potato chunks and carrots, cover, and braise on low heat for 20 minutes, until the potato is tender and the chicken is falling from the bone.",
      "Uncover and reduce the sauce for 3–4 minutes until it thickens enough to coat the chicken.",
      "Scatter the coriander and serve over rice, with the sauce spooned generously.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-ropa-vieja-pollo",
    name: { en: "Ropa Vieja de Pollo (Shredded Chicken)", hindi: "रोपा विएहा चिकन" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 600 }, // chicken breast
      { foodId: "usda-170108", grams: 200 }, // red sweet pepper, in strips
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper, in strips
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 200 }, // onion, in strips
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-173469", grams: 10 }, // cider vinegar
      { foodId: "usda-171413", grams: 12 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken in salted water for 15 minutes until tender; reserve the broth and shred the chicken into long, fine strands — ropa vieja means 'old clothes', and the shreds should look the part.",
      "Soften the onion and pepper strips in the olive oil until sweet and collapsing.",
      "Add the garlic, tomatoes and cumin and cook 5 minutes into a rich sauce.",
      "Add the shredded chicken and a ladle of its broth; braise 10 minutes so the strands drink the sauce.",
      "Splash in the vinegar at the end to brighten it, season with salt, and reduce until the mixture is moist but not soupy.",
      "Serve over rice — the chicken should be in saucy, tender rags, true to its name.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-turkey-picadillo",
    name: { en: "Turkey Picadillo", hindi: "टर्की पिकाडिलो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2514747", grams: 600 }, // ground turkey
      { foodId: "usda-2346401", grams: 250 }, // potato, finely diced
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-170427", grams: 150 }, // green sweet pepper
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-171320", grams: 1 }, // cinnamon, a pinch
      { foodId: "usda-171413", grams: 10 }, // olive oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Brown the turkey in the olive oil in a wide pot, breaking it into small crumbles, until it starts to crisp at the edges.",
      "Add the onion and pepper and cook 5 minutes until soft.",
      "Add the garlic, cumin and cinnamon and fry 1 minute — the cinnamon pinch is picadillo's quiet signature.",
      "Add the tomatoes and the finely diced potato with a splash of water; season with salt.",
      "Simmer, partially covered, for 15–18 minutes, until the potato is tender and the mixture is moist and rich, not dry.",
      "Rest 5 minutes and serve over rice.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-shrimp-ceviche",
    name: { en: "Shrimp Ceviche", hindi: "झींगा सेविचे" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-167746", grams: 120 }, // lemon, for juice
      { foodId: "usda-170457", grams: 150 }, // tomato, diced
      { foodId: "usda-790646", grams: 100 }, // onion, finely diced
      { foodId: "usda-2346406", grams: 100 }, // cucumber, diced
      { foodId: "usda-169997", grams: 15 }, // coriander leaves
      { foodId: "usda-170106", grams: 8 }, // red hot chilli, finely chopped
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cut the shrimp into bite-size pieces and cover completely with the lemon juice and salt; rest in the fridge for 20–30 minutes, until the flesh turns opaque and firm — the citrus 'cooks' it.",
      "Soak the diced onion in cold water for 5 minutes to soften its bite; drain.",
      "Drain off half the lemon juice from the shrimp, keeping the rest as the dressing.",
      "Fold in the tomato, cucumber, onion, chilli and coriander.",
      "Rest 10 minutes so the flavours marry; taste for salt and lemon — ceviche should be bright, cold and fiery.",
      "Serve chilled, in small bowls or glasses, with tortilla chips or on tostadas if you have them.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-aguachile",
    name: { en: "Shrimp Aguachile", hindi: "अगुआचिले" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-175179", grams: 300 }, // shrimp (prawns)
      { foodId: "usda-167746", grams: 130 }, // lemon, for juice
      { foodId: "usda-170497", grams: 25 }, // green hot chilli
      { foodId: "usda-2346406", grams: 150 }, // cucumber, in half-moons
      { foodId: "usda-790646", grams: 80 }, // onion, thinly sliced
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Butterfly the shrimp by cutting along the back so they open flat — aguachile shrimp are opened so the chilli water touches every surface.",
      "Blend the green chillies and coriander with the lemon juice and salt into a bright green liquor — this is the 'chilli water' the dish is named for.",
      "Lay the shrimp in a shallow dish in a single layer and pour the green liquor over them.",
      "Rest 10–15 minutes, turning once, until the shrimp firm up and turn opaque at the edges; aguachile is served fresher and rarer than ceviche.",
      "Scatter the cucumber half-moons and onion slices over the top.",
      "Serve immediately, cold and electric green, with the liquor spooned over every bite.",
    ],
    timeMinutes: 25,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-turkey-empanadas",
    name: { en: "Turkey Empanadas", hindi: "टर्की एम्पानाडास" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168936", grams: 300 }, // wheat flour, for dough
      { foodId: "usda-2514747", grams: 500 }, // ground turkey
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-170108", grams: 100 }, // red sweet pepper
      { foodId: "usda-171287", grams: 60 }, // egg, whole, chopped into the filling
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-171025", grams: 30 }, // sunflower oil, for frying
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Make the dough: rub a little of the oil into the flour and salt, then bring together with warm water into a smooth dough; rest 30 minutes.",
      "Brown the turkey with the onion and pepper, breaking it up finely; add the cumin and salt and cook until the mixture is dry and rich — a wet filling bursts empanadas.",
      "Cool the filling, then fold in the chopped boiled egg.",
      "Roll the dough thin and cut 12 cm rounds; place a spoonful of filling in the centre of each.",
      "Wet the edges, fold into half-moons, and crimp firmly with a fork or a rope fold (repulgue).",
      "Fry in hot oil for 2–3 minutes per side until deep golden and blistered, or bake at 200°C for 18 minutes. Drain and serve hot.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-tamal-cazuela",
    name: { en: "Tamal de Cazuela (Chicken Tamale Pie)", hindi: "तमाल दे काज़ुएला" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 300 }, // cornmeal, for the tamal dough
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-322892", grams: 200 }, // milk, whole, for the dough
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-170106", grams: 10 }, // red hot chilli
      { foodId: "usda-329370", grams: 60 }, // mozzarella
      { foodId: "usda-172336", grams: 30 }, // canola oil, for the dough
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken in salted water for 12 minutes; reserve the broth and shred the chicken.",
      "Blend the tomatoes with the chilli and simmer 5 minutes into a loose red sauce; fold in the shredded chicken and season.",
      "Make the tamal dough: whisk the cornmeal into the warm milk and about 300 ml of the chicken broth, and cook, stirring constantly, for 8–10 minutes into a thick, soft dough; beat in the oil and salt — it should be spreadable, like a thick polenta.",
      "Spread half the dough in a greased baking dish or cazuela.",
      "Spoon the chicken mixture over it, then spread the remaining dough on top, sealing the edges.",
      "Scatter the mozzarella and bake at 190°C for 25–30 minutes until set, puffed and golden in patches. Rest 10 minutes before cutting — it slices like a pie, soft and steaming.",
    ],
    timeMinutes: 60,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-sopa-de-lima",
    name: { en: "Sopa de Lima (Chicken & Lemon Soup)", hindi: "सोपा दे लीमा" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-170457", grams: 250 }, // tomatoes
      { foodId: "usda-168867", grams: 80 }, // cornmeal, for tortilla strips
      { foodId: "usda-167746", grams: 100 }, // lemon
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-170427", grams: 100 }, // green sweet pepper
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken in about 1.2 litres of salted water for 12 minutes; lift out, shred, and keep the broth — this soup is only ever as good as its broth.",
      "Make thin tortillas from the cornmeal and warm water, cut them into strips, and toast or fry them in the oil until crisp; set aside.",
      "Soften the onion and pepper in a little oil; add the garlic and tomatoes and cook 4 minutes into a loose sofrito.",
      "Add the sofrito and shredded chicken to the broth and simmer 8 minutes.",
      "Take off the heat and stir in most of the lemon juice — citrus boiled in the soup turns bitter, so it goes in at the end.",
      "Serve in bowls topped with the crisp tortilla strips, coriander and a lemon wedge each; the soup should be bright, brothy and aromatic.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-gallo-pinto",
    name: { en: "Gallo Pinto with Egg", hindi: "गालो पिंटो" },
    category: "breakfast",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 140 }, // white rice, dry
      { foodId: "usda-173734", grams: 120 }, // black beans, dry
      { foodId: "usda-171287", grams: 150 }, // egg, whole
      { foodId: "usda-790646", grams: 60 }, // onion
      { foodId: "usda-170108", grams: 60 }, // red sweet pepper
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-171411", grams: 8 }, // soybean oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the black beans until tender (soaked overnight, about 40 minutes), keeping their dark cooking liquid; cook the rice and let it cool — gallo pinto is classically made with yesterday's rice and beans.",
      "Soften the onion and pepper in the oil until sweet.",
      "Add the beans with a ladle of their liquid and fry for 3 minutes, lightly crushing some beans so they stain everything.",
      "Fold in the cold rice and fry, stirring, for 4–5 minutes until the grains are evenly speckled red-black — gallo pinto means 'spotted rooster'.",
      "Season with salt, scatter the coriander, and meanwhile fry the eggs sunny-side up in a separate pan.",
      "Serve the rice and beans with a fried egg on top of each plate.",
    ],
    timeMinutes: 35,
    budgetTier: 2,
    enriched: false,
  },
  {
    id: "dish-mx-arepas-reina-pepiada",
    name: { en: "Arepas Reina Pepiada (Chicken & Avocado)", hindi: "अरेपास रीना पेपियाडा" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 160 }, // cornmeal, for arepas
      { foodId: "usda-2646170", grams: 260 }, // chicken breast
      { foodId: "usda-171705", grams: 200 }, // avocado
      { foodId: "usda-167746", grams: 30 }, // lemon
      { foodId: "usda-169997", grams: 8 }, // coriander leaves
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Make the arepa dough: mix the cornmeal with warm water and salt into a soft dough; rest 10 minutes, then shape into 4 thick discs about 2 cm deep.",
      "Cook the discs on a dry hot pan for 5 minutes per side until crusted, then finish in a hot oven for 8 minutes until they sound hollow when tapped.",
      "Poach the chicken for 12 minutes and shred it finely.",
      "Mash the avocado with the lemon juice and salt — it binds the filling the way mayonnaise does in the classic — and fold in the shredded chicken and coriander.",
      "Split the hot arepas open like pockets, keeping them hinged.",
      "Fill generously with the chicken-avocado mixture and serve at once, while the arepas are crisp outside and steaming inside.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-mx-arepas-beans-cheese",
    name: { en: "Arepas with Black Beans & Cheese", hindi: "अरेपास बीन पनीर" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-168867", grams: 160 }, // cornmeal, for arepas
      { foodId: "usda-173734", grams: 130 }, // black beans, dry
      { foodId: "usda-329370", grams: 70 }, // mozzarella
      { foodId: "usda-170923", grams: 2 }, // cumin seed, ground
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the black beans until completely tender (soaked overnight, about 40 minutes); season with the cumin and salt and mash roughly so they hold together in a thick, creamy mass.",
      "Make the arepa dough from the cornmeal, warm water and salt; rest 10 minutes and shape into 4 thick discs.",
      "Cook the discs on a dry hot pan for 5 minutes per side until crusted, then finish in a hot oven for 8 minutes until hollow-sounding when tapped.",
      "Split the hot arepas open like pockets.",
      "Fill each with a thick layer of the mashed beans and a slice of mozzarella; close and return to the hot pan for 1 minute so the cheese melts into the beans.",
      "Serve at once, crisp outside and molten inside.",
    ],
    timeMinutes: 45,
    budgetTier: 1,
    enriched: false,
  },
  {
    id: "dish-mx-chicken-pozole",
    name: { en: "Pozole de Pollo (Chicken Pozole)", hindi: "पोज़ोले दे पोलो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-2710826", grams: 300 }, // corn kernels, standing in for pozole corn
      { foodId: "usda-170106", grams: 12 }, // red hot chilli
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-2346407", grams: 150 }, // cabbage, shredded, to serve
      { foodId: "usda-167746", grams: 50 }, // lemon, to serve
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken in about 1.4 litres of salted water with half the onion and garlic for 15 minutes; lift out, shred coarsely, and keep the broth.",
      "Blend the chillies with the remaining garlic and a ladle of broth; fry this red paste in a dry-hot pot for 2 minutes until it darkens.",
      "Pour the broth back in, add the corn, and simmer 15 minutes so the broth turns red and rich.",
      "Return the shredded chicken and simmer 5 minutes; season with salt.",
      "Serve in deep bowls topped with shredded cabbage, diced raw onion from the measured amount if any remains, and lemon wedges — pozole is finished at the table, crunchy and bright against the hot broth.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pe-pollo-saltado",
    name: { en: "Pollo Saltado (Peruvian Chicken Stir-Fry)", hindi: "पोलो साल्टाडो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-2346401", grams: 400 }, // potato, cut as fries
      { foodId: "usda-170457", grams: 300 }, // tomatoes, in wedges
      { foodId: "usda-790646", grams: 200 }, // onion, in wedges
      { foodId: "usda-173469", grams: 20 }, // cider vinegar
      { foodId: "usda-1104647", grams: 10 }, // garlic
      { foodId: "usda-169997", grams: 12 }, // coriander leaves
      { foodId: "usda-171411", grams: 20 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Cut the potatoes into thick fries and fry in half the oil until golden and crisp; drain and salt them — they go in at the end and must stay crisp.",
      "Cut the chicken into strips and season with salt; sear in a smoking wok with the remaining oil until just cooked and charred at the edges; lift out.",
      "In the same wok, stir-fry the onion wedges for 1 minute, keeping them crisp; add the garlic and tomato wedges and cook 1 minute until the tomatoes just slump and release their juice.",
      "Return the chicken, splash in the vinegar, and toss over the highest heat for 30 seconds so the juices turn into a light, tangy sauce.",
      "Fold in the hot fries and toss once — they should stay crisp even as they take on the sauce.",
      "Scatter the coriander and serve at once, classically over rice.",
    ],
    timeMinutes: 35,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pe-aji-de-gallina",
    name: { en: "Aji de Gallina (Peruvian Chicken in Walnut Sauce)", hindi: "आजी दे गलीना" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646170", grams: 550 }, // chicken breast
      { foodId: "usda-2346394", grams: 60 }, // walnuts
      { foodId: "usda-322892", grams: 300 }, // milk, whole
      { foodId: "usda-325036", grams: 40 }, // parmesan
      { foodId: "usda-168936", grams: 40 }, // wheat flour, to thicken (bread in the classic)
      { foodId: "usda-2346401", grams: 300 }, // potato, boiled, to serve
      { foodId: "usda-171287", grams: 100 }, // egg, whole, boiled, to serve
      { foodId: "usda-172231", grams: 3 }, // turmeric, for the golden colour
      { foodId: "usda-170106", grams: 8 }, // red hot chilli
      { foodId: "usda-790646", grams: 100 }, // onion
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Poach the chicken in salted water for 12 minutes; reserve the broth and shred the chicken finely. Boil the potatoes and eggs separately.",
      "Soften the onion in a little oil; blend it with the walnuts, milk, turmeric and chilli into a smooth, golden sauce.",
      "Pour the sauce into a pot, whisk in the flour, and simmer, stirring, for 5 minutes until it thickens to a creamy, coating consistency, loosening with chicken broth as needed.",
      "Stir in the parmesan and the shredded chicken; simmer 3 minutes to marry. Season with salt.",
      "Serve the chicken in its walnut sauce over the boiled potatoes, with halved boiled eggs alongside, in the classic presentation.",
      "The sauce should be pale gold, nutty and gentle, with warmth rather than fire.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pe-arroz-chaufa",
    name: { en: "Arroz Chaufa (Peruvian Fried Rice)", hindi: "अर्रोज़ चाउफा" },
    category: "main",
    servings: 2,
    cuisine: "international",
    lines: [
      { foodId: "usda-2512381", grams: 170 }, // white rice, dry
      { foodId: "usda-2646170", grams: 220 }, // chicken breast
      { foodId: "usda-171287", grams: 150 }, // egg, whole
      { foodId: "usda-790646", grams: 60 }, // onion, finely diced
      { foodId: "usda-170427", grams: 80 }, // green sweet pepper
      { foodId: "usda-169231", grams: 10 }, // ginger
      { foodId: "usda-171016", grams: 10 }, // sesame oil
      { foodId: "usda-173468", grams: 4 }, // salt
    ],
    method: [
      "Cook the rice and cool it completely — chaufa, like all fried rice, is built on cold rice.",
      "Cut the chicken into small cubes, season with salt, and sear in a smoking wok with half the sesame oil until cooked and golden; lift out.",
      "Scramble the eggs in the same wok into a thin omelette; lift out and cut into strips — chaufa's egg goes on in ribbons, not curds.",
      "Stir-fry the onion, pepper and ginger for 1 minute; add the cold rice and toss over the highest heat for 3–4 minutes until the grains toast.",
      "Return the chicken, season with salt, and toss for 1 minute.",
      "Serve topped with the egg ribbons and a final drizzle of sesame oil.",
    ],
    timeMinutes: 30,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-pe-seco-de-pollo",
    name: { en: "Seco de Pollo (Coriander Chicken Stew)", hindi: "सेको दे पोलो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2646171", grams: 600 }, // chicken thigh
      { foodId: "usda-169997", grams: 60 }, // coriander leaves, blended for the sauce
      { foodId: "usda-2346401", grams: 300 }, // potato, in chunks
      { foodId: "usda-170419", grams: 120 }, // peas, green
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-170923", grams: 3 }, // cumin seed, ground
      { foodId: "usda-171411", grams: 10 }, // soybean oil
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Blend the coriander leaves with a little water into a vivid green liquor — this is seco's soul; the stew is green, not brown.",
      "Brown the chicken pieces in the oil in a heavy pot; lift out.",
      "Soften the onion in the same pot; add the garlic and cumin for 1 minute.",
      "Pour in the coriander liquor and cook it for 3 minutes, stirring, until it darkens from bright green to deep olive and smells cooked — raw coriander tastes grassy; cooked, it is seco.",
      "Return the chicken with the potato chunks and enough water to half-cover; simmer, covered, for 18 minutes until the potato is tender.",
      "Stir in the peas, cook 3 minutes more, season with salt, and serve over rice with the green sauce spooned generously.",
    ],
    timeMinutes: 45,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-br-moqueca",
    name: { en: "Moqueca (Brazilian Fish Stew)", hindi: "मोकेका" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-2684442", grams: 600 }, // tilapia
      { foodId: "usda-170172", grams: 350 }, // coconut milk
      { foodId: "usda-170457", grams: 300 }, // tomatoes
      { foodId: "usda-170108", grams: 150 }, // red sweet pepper
      { foodId: "usda-170427", grams: 100 }, // green sweet pepper
      { foodId: "usda-790646", grams: 150 }, // onion
      { foodId: "usda-169997", grams: 20 }, // coriander leaves
      { foodId: "usda-1104647", grams: 12 }, // garlic
      { foodId: "usda-167746", grams: 40 }, // lemon
      { foodId: "usda-173468", grams: 5 }, // salt
    ],
    method: [
      "Marinate the fish pieces for 20 minutes with the lemon juice, garlic and salt.",
      "Layer half the onion, tomatoes and peppers in a wide, heavy pot; lay the fish over them, then cover with the remaining vegetables — moqueca is layered, never stirred.",
      "Pour the coconut milk over everything.",
      "Cover and cook on medium heat for 15 minutes, shaking the pot gently now and then but never stirring, until the fish is just cooked and the vegetables have collapsed into a rich, fragrant broth.",
      "Scatter the coriander leaves over the top and rest 3 minutes.",
      "Serve from the pot over rice, the broth spooned over everything.",
    ],
    timeMinutes: 40,
    budgetTier: 3,
    enriched: false,
  },
  {
    id: "dish-br-escondidinho",
    name: { en: "Escondidinho de Frango (Cassava & Chicken Bake)", hindi: "एस्कोंडिडिन्हो" },
    category: "main",
    servings: 4,
    cuisine: "international",
    lines: [
      { foodId: "usda-169985", grams: 700 }, // cassava
      { foodId: "usda-2646170", grams: 500 }, // chicken breast
      { foodId: "usda-329370", grams: 80 }, // mozzarella
      { foodId: "usda-322892", grams: 150 }, // milk, whole, for the mash
      { foodId: "usda-170457", grams: 200 }, // tomatoes
      { foodId: "usda-790646", grams: 120 }, // onion
      { foodId: "usda-173410", grams: 25 }, // butter, for the mash
      { foodId: "usda-1104647", grams: 8 }, // garlic
      { foodId: "usda-173468", grams: 6 }, // salt
    ],
    method: [
      "Poach the chicken for 12 minutes and shred it; soften the onion and garlic, add the tomatoes, and cook into a loose sauce; fold in the chicken and season — this is the 'hidden' layer.",
      "Boil the cassava in salted water for 20–25 minutes until completely tender — undercooked cassava never mashes smooth.",
      "Drain the cassava, pick out the fibrous core, and mash it hot with the butter, milk and salt until smooth and fluffy.",
      "Spread the chicken mixture in a baking dish.",
      "Cover completely with the cassava mash, sealing the edges — escondidinho means 'little hidden one', and no chicken should peek through.",
      "Scatter the mozzarella and bake at 200°C for 15–18 minutes until golden and bubbling at the edges. Rest 5 minutes and serve.",
    ],
    timeMinutes: 55,
    budgetTier: 3,
    enriched: false,
  },
];
