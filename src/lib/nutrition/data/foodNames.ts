/**
 * Friendly display names + Hindi kitchen names for the USDA reference
 * foods (D1, dishes foundation).
 *
 * The generated reference data keeps each food's full USDA description —
 * that is the provenance record, and it is never edited. But USDA
 * descriptions are written for analysts, not cooks: "Beans, navy, mature
 * seeds, raw", "Wheat flour, whole-grain (Includes foods for USDA's Food
 * Distribution Program)". This hand-maintained module is the display
 * layer over that record: `display` is the name a person cooks with,
 * `hindi` the common Hindi kitchen name in Devanagari (atta, arhar dal,
 * haldi, jeera…). Where a food has no distinct Hindi kitchen name, the
 * standard transliteration is used — no obscure words are invented.
 *
 * A name is not a nutrient claim: this module carries no values, only
 * words. Coverage is total by test — every reference food has an entry,
 * so a food added to the reference set cannot ship nameless.
 */

export interface FoodNames {
  /** The cook's name for the food, USDA legalese stripped. */
  display: string;
  /** The common Hindi kitchen name, in Devanagari. */
  hindi: string;
}

export const FOOD_NAMES: Readonly<Record<string, FoodNames>> = {
  /* Grains, flours and cereals */
  "usda-2512381": { display: "White rice", hindi: "चावल" },
  "usda-2512380": { display: "Brown rice", hindi: "भूरा चावल" },
  "usda-2710825": { display: "Black rice", hindi: "काला चावल" },
  "usda-2346396": { display: "Rolled oats", hindi: "जई" },
  "usda-2346397": { display: "Steel-cut oats", hindi: "जई" },
  "usda-2512379": { display: "Millet", hindi: "बाजरा" },
  "usda-2710842": { display: "Sorghum (jowar)", hindi: "ज्वार" },
  "usda-2512378": { display: "Buckwheat (kuttu)", hindi: "कूटू" },
  "usda-168874": { display: "Quinoa", hindi: "किनोआ" },
  "usda-170284": { display: "Barley", hindi: "जौ" },
  "usda-168893": { display: "Whole wheat flour (atta)", hindi: "गेहूं का आटा" },
  "usda-168936": { display: "Refined wheat flour (maida)", hindi: "मैदा" },
  "usda-168867": { display: "Cornmeal (makki ka atta)", hindi: "मक्की का आटा" },
  "usda-168886": { display: "Rye flour", hindi: "राई का आटा" },
  "usda-174288": { display: "Chickpea flour (besan)", hindi: "बेसन" },
  "usda-169714": { display: "Rice flour", hindi: "चावल का आटा" },
  "usda-168933": { display: "Semolina (sooji)", hindi: "सूजी" },
  "usda-168147": { display: "Vital wheat gluten", hindi: "गेहूं का ग्लूटेन" },

  /* Pulses and legumes */
  "usda-2644283": { display: "Lentils (whole)", hindi: "साबुत दाल" },
  "usda-174284": { display: "Red lentils (masoor dal)", hindi: "मसूर दाल" },
  "usda-2644282": { display: "Chickpeas (kabuli chana)", hindi: "काबुली चना" },
  "usda-173734": { display: "Black beans", hindi: "ब्लैक बीन्स" },
  "usda-175193": { display: "Kidney beans (rajma)", hindi: "राजमा" },
  "usda-173745": { display: "Navy beans", hindi: "सफ़ेद राजमा" },
  "usda-175199": { display: "Pinto beans", hindi: "पिंटो बीन्स" },
  "usda-174270": { display: "Soybeans", hindi: "सोयाबीन" },
  "usda-174268": { display: "Soya chunks (textured soy protein)", hindi: "सोया चंक्स" },
  "usda-172448": { display: "Tofu (firm)", hindi: "टोफू" },
  "usda-174290": { display: "Tofu (extra firm)", hindi: "टोफू" },
  "usda-172449": { display: "Tofu (soft)", hindi: "टोफू" },
  "usda-174272": { display: "Tempeh", hindi: "टेम्पेह" },
  "usda-168410": { display: "Edamame", hindi: "एडामामे" },
  "usda-168411": { display: "Edamame (cooked)", hindi: "एडामामे" },
  "usda-172436": { display: "Pigeon peas (arhar dal)", hindi: "अरहर दाल" },
  "usda-174256": { display: "Mung beans (moong dal)", hindi: "मूंग दाल" },
  "usda-174259": { display: "Black gram (urad dal)", hindi: "उड़द दाल" },
  "usda-170419": { display: "Green peas", hindi: "हरी मटर" },
  "usda-173758": { display: "Cowpeas (lobia)", hindi: "लोबिया" },

  /* Dairy and fats */
  "usda-322892": { display: "Whole milk", hindi: "दूध" },
  "usda-322559": { display: "Skimmed milk", hindi: "बिना मलाई का दूध" },
  "usda-172195": { display: "Skimmed milk powder", hindi: "स्किम्ड मिल्क पाउडर" },
  "usda-2259793": { display: "Yogurt (dahi)", hindi: "दही" },
  "usda-330137": { display: "Greek yogurt (hung curd)", hindi: "गाढ़ा दही" },
  "usda-170903": { display: "Greek yogurt, low-fat (hung curd)", hindi: "गाढ़ा दही" },
  "usda-328637": { display: "Cheddar cheese", hindi: "चेडर चीज़" },
  "usda-329370": { display: "Mozzarella", hindi: "मोज़ेरेला चीज़" },
  "usda-325036": { display: "Parmesan", hindi: "पार्मेसन चीज़" },
  "usda-328841": { display: "Cottage cheese", hindi: "कॉटेज चीज़" },
  /* M-229: the library's first non-USDA food — CoFID's "Cheese, Paneer"
     wears its kitchen name here like every other reference food. */
  "cofid-12-495": { display: "Paneer", hindi: "पनीर" },
  "usda-2346384": { display: "Cottage cheese (full-fat)", hindi: "कॉटेज चीज़" },
  "usda-323444": { display: "Ricotta", hindi: "रिकोटा चीज़" },
  "usda-173410": { display: "Butter", hindi: "मक्खन" },
  "usda-171314": { display: "Ghee (clarified butter)", hindi: "घी" },

  /* Eggs */
  "usda-171287": { display: "Egg", hindi: "अंडा" },
  "usda-172183": { display: "Egg white", hindi: "अंडे की सफ़ेदी" },
  "usda-172184": { display: "Egg yolk", hindi: "अंडे की ज़र्दी" },
  "usda-173424": { display: "Boiled egg", hindi: "उबला अंडा" },

  /* Meat, poultry and fish */
  "usda-2646170": { display: "Chicken breast", hindi: "चिकन ब्रेस्ट" },
  "usda-171477": { display: "Chicken breast, roasted", hindi: "चिकन ब्रेस्ट" },
  "usda-2646171": { display: "Chicken thigh", hindi: "चिकन थाई" },
  "usda-168608": { display: "Ground beef (keema)", hindi: "बीफ़ कीमा" },
  "usda-2514745": { display: "Ground pork", hindi: "पोर्क कीमा" },
  "usda-2646168": { display: "Pork loin", hindi: "पोर्क" },
  "usda-174370": { display: "Ground lamb (mutton keema)", hindi: "मटन कीमा" },
  "usda-2514747": { display: "Ground turkey", hindi: "टर्की कीमा" },
  "usda-171098": { display: "Turkey breast", hindi: "टर्की ब्रेस्ट" },
  "usda-171496": { display: "Turkey breast, roasted", hindi: "टर्की ब्रेस्ट" },
  "usda-2684441": { display: "Salmon", hindi: "सैल्मन मछली" },
  "usda-2684444": { display: "Cod", hindi: "कॉड मछली" },
  "usda-2684442": { display: "Tilapia", hindi: "तिलापिया मछली" },
  "usda-333374": { display: "Haddock", hindi: "हैडॉक मछली" },
  "usda-334194": { display: "Tuna (canned)", hindi: "टूना मछली" },
  "usda-175139": { display: "Sardines (canned)", hindi: "सार्डिन मछली" },
  "usda-175119": { display: "Mackerel", hindi: "मैकेरल मछली" },
  "usda-175179": { display: "Shrimp (prawns)", hindi: "झींगा" },

  /* Oils */
  "usda-171413": { display: "Olive oil", hindi: "जैतून का तेल" },
  "usda-330458": { display: "Coconut oil", hindi: "नारियल तेल" },
  "usda-172336": { display: "Canola oil", hindi: "कैनोला तेल" },
  "usda-171411": { display: "Soybean oil", hindi: "सोयाबीन तेल" },
  "usda-171410": { display: "Peanut (groundnut) oil", hindi: "मूंगफली तेल" },
  "usda-171025": { display: "Sunflower oil", hindi: "सूरजमुखी तेल" },
  "usda-171016": { display: "Sesame oil (til oil)", hindi: "तिल का तेल" },
  "usda-172337": { display: "Mustard oil (sarson ka tel)", hindi: "सरसों का तेल" },

  /* Vegetables */
  "usda-2346401": { display: "Potato", hindi: "आलू" },
  "usda-2346404": { display: "Sweet potato", hindi: "शकरकंद" },
  "usda-790646": { display: "Onion", hindi: "प्याज़" },
  "usda-170457": { display: "Tomato", hindi: "टमाटर" },
  "usda-2258586": { display: "Carrot", hindi: "गाजर" },
  "usda-321900": { display: "Broccoli", hindi: "ब्रोकली" },
  "usda-2685573": { display: "Cauliflower", hindi: "फूलगोभी" },
  "usda-2346407": { display: "Cabbage", hindi: "पत्तागोभी" },
  "usda-2346406": { display: "Cucumber", hindi: "खीरा" },
  "usda-2710826": { display: "Sweet corn", hindi: "मीठी मकई" },
  "usda-168462": { display: "Spinach", hindi: "पालक" },
  "usda-170427": { display: "Green bell pepper (capsicum)", hindi: "हरी शिमला मिर्च" },
  "usda-170108": { display: "Red bell pepper", hindi: "लाल शिमला मिर्च" },
  "usda-1750347": { display: "Button mushrooms", hindi: "मशरूम" },
  "usda-2346400": { display: "Green beans (french beans)", hindi: "हरी बीन्स" },
  "usda-2685577": { display: "Eggplant (brinjal)", hindi: "बैंगन" },
  "usda-170497": { display: "Green chilli", hindi: "हरी मिर्च" },
  "usda-170106": { display: "Red chilli", hindi: "लाल मिर्च" },
  "usda-169260": { display: "Okra (bhindi)", hindi: "भिंडी" },
  "usda-168393": { display: "Bitter gourd (karela)", hindi: "करेला" },
  "usda-169985": { display: "Cassava (tapioca)", hindi: "कसावा" },
  "usda-2710818": { display: "Plantain (raw banana)", hindi: "कच्चा केला" },
  "usda-169308": { display: "Taro (arbi)", hindi: "अरबी" },
  "usda-170069": { display: "Ash gourd (petha)", hindi: "पेठा" },
  "usda-170483": { display: "Drumstick pods", hindi: "सहजन की फली" },
  "usda-168416": { display: "Moringa leaves (drumstick leaves)", hindi: "सहजन के पत्ते" },

  /* Fruits */
  "usda-173944": { display: "Banana", hindi: "केला" },
  "usda-171688": { display: "Apple", hindi: "सेब" },
  "usda-746771": { display: "Orange", hindi: "संतरा" },
  "usda-169910": { display: "Mango", hindi: "आम" },
  "usda-327699": { display: "Strawberries", hindi: "स्ट्रॉबेरी" },
  "usda-174683": { display: "Grapes", hindi: "अंगूर" },
  "usda-171705": { display: "Avocado", hindi: "एवोकाडो" },
  "usda-167746": { display: "Lemon", hindi: "नींबू" },
  "usda-167765": { display: "Watermelon", hindi: "तरबूज़" },
  "usda-169124": { display: "Pineapple", hindi: "अनानास" },
  "usda-746773": { display: "Pear", hindi: "नाशपाती" },
  "usda-167763": { display: "Tamarind", hindi: "इमली" },
  "usda-174687": { display: "Jackfruit", hindi: "कटहल" },

  /* Nuts and seeds */
  "usda-2346393": { display: "Almonds", hindi: "बादाम" },
  "usda-2346394": { display: "Walnuts", hindi: "अखरोट" },
  "usda-2515374": { display: "Cashew nuts", hindi: "काजू" },
  "usda-172430": { display: "Peanuts (groundnuts)", hindi: "मूंगफली" },
  "usda-2515381": { display: "Sunflower seeds", hindi: "सूरजमुखी के बीज" },
  "usda-2515380": { display: "Pumpkin seeds (pepitas)", hindi: "कद्दू के बीज" },
  "usda-170148": { display: "Hemp seeds", hindi: "भांग के बीज" },
  "usda-170150": { display: "Sesame seeds (til)", hindi: "तिल" },
  "usda-170169": { display: "Coconut (fresh)", hindi: "नारियल" },
  "usda-170172": { display: "Coconut milk", hindi: "नारियल का दूध" },

  /* Spices and aromatics */
  "usda-1104647": { display: "Garlic", hindi: "लहसुन" },
  "usda-169231": { display: "Ginger", hindi: "अदरक" },
  "usda-172231": { display: "Turmeric (ground)", hindi: "हल्दी" },
  "usda-170923": { display: "Cumin seeds", hindi: "जीरा" },
  "usda-170922": { display: "Coriander seeds", hindi: "धनिया" },
  "usda-170929": { display: "Mustard seeds (ground)", hindi: "सरसों" },
  "usda-170932": { display: "Cayenne pepper (red chilli powder)", hindi: "लाल मिर्च पाउडर" },
  "usda-171319": { display: "Chilli powder blend", hindi: "चिली पाउडर" },
  "usda-170924": { display: "Curry powder", hindi: "करी पाउडर" },
  "usda-171324": { display: "Fenugreek seeds (methi)", hindi: "मेथी दाना" },
  "usda-170919": { display: "Cardamom", hindi: "इलायची" },
  "usda-171321": { display: "Cloves", hindi: "लौंग" },
  "usda-171320": { display: "Cinnamon", hindi: "दालचीनी" },
  "usda-170917": { display: "Bay leaf (tej patta)", hindi: "तेज पत्ता" },
  "usda-171323": { display: "Fennel seeds (saunf)", hindi: "सौंफ़" },
  "usda-170931": { display: "Black pepper", hindi: "काली मिर्च" },
  "usda-171330": { display: "Poppy seeds (khus khus)", hindi: "खसखस" },
  "usda-169997": { display: "Fresh coriander leaves", hindi: "हरा धनिया" },
  "usda-173475": { display: "Mint leaves (pudina)", hindi: "पुदीना" },

  /* Pantry */
  "usda-169640": { display: "Honey", hindi: "शहद" },
  "usda-173468": { display: "Table salt", hindi: "नमक" },
  "usda-334247": { display: "Sugar", hindi: "चीनी" },
  "usda-173469": { display: "Apple cider vinegar", hindi: "सेब का सिरका" },
  "usda-173177": { display: "Whey protein powder (isolate)", hindi: "व्हे प्रोटीन पाउडर" },
  "usda-173180": { display: "Whey protein powder", hindi: "व्हे प्रोटीन पाउडर" },
  "usda-173181": { display: "Soy protein powder", hindi: "सोया प्रोटीन पाउडर" },
  "usda-173427": { display: "Egg white powder", hindi: "अंडे की सफ़ेदी का पाउडर" },
};

/** The display + Hindi names for a reference food id, or null when the
 *  id is not a reference food (a user's own food keeps its own name). */
export function foodNamesFor(id: string): FoodNames | null {
  return FOOD_NAMES[id] ?? null;
}
