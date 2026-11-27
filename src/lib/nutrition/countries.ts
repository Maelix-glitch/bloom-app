/**
 * Countries and dish homelands (M-251) — the ONE place the country
 * model lives: the full country list the Assessment asks from, and
 * the mapping that says which country each dish belongs to.
 *
 * Why a mapping at all: dishes carry only a cuisine STRING
 * ("india" | "kerala" | "international" today). India's two tags are
 * the country India. Every other single-country wave follows the
 * same convention — the Bulgarian wave tags its dishes
 * cuisine: "bulgaria" — so CUISINE_COUNTRY below is where a wave's
 * tag becomes a country, in this one place, and nothing else in the
 * app needs to know the tag exists.
 *
 * The "international" tag is a shelf, not a country: its dishes are
 * placed by the curated name markers in COUNTRY_DISH_MARKERS,
 * derived from the dishes' own names (the regions.ts method). A
 * dish whose name carries no marker, or markers for two countries,
 * belongs to NO country — honestly unplaced, the way regions.ts
 * treats a dish with both North and South markers. 343 of the 702
 * international dishes place today; the rest are the generic
 * protein-wave dishes ("Herb-Grilled Chicken with Broccoli") that
 * belong to no country, and inventing one for them would be a lie.
 *
 * Sides: a dish's side of its country. India's North/South come
 * from regions.ts (dishRegion); East/West/Central/North-East come
 * from the marker table below, measured against the real shelf
 * (West 19 dishes, East 13, Central 3, North-East 1 before region
 * interplay). Only North/South/East/West are OFFERED as Assessment
 * answers — a 3-dish shelf is a broken promise — but Central and
 * North-East dishes still resolve to their side here, so a chosen
 * side never silently includes them and "All of India" always does.
 */

import type { FoodSide } from "@/lib/vitalis/domain/profile";
import type { Dish } from "./dishes";
import { dishRegion } from "./regions";

/* --------------------------- the list --------------------------- */

export interface Country {
  readonly code: string;
  readonly name: string;
}

/** The full ISO 3166-1 alpha-2 country list, alphabetical by name. */
export const COUNTRIES: readonly Country[] = [
  { code: "AF", name: "Afghanistan" },
  { code: "AX", name: "Åland Islands" },
  { code: "AL", name: "Albania" },
  { code: "DZ", name: "Algeria" },
  { code: "AS", name: "American Samoa" },
  { code: "AD", name: "Andorra" },
  { code: "AO", name: "Angola" },
  { code: "AI", name: "Anguilla" },
  { code: "AQ", name: "Antarctica" },
  { code: "AG", name: "Antigua and Barbuda" },
  { code: "AR", name: "Argentina" },
  { code: "AM", name: "Armenia" },
  { code: "AW", name: "Aruba" },
  { code: "AU", name: "Australia" },
  { code: "AT", name: "Austria" },
  { code: "AZ", name: "Azerbaijan" },
  { code: "BS", name: "Bahamas" },
  { code: "BH", name: "Bahrain" },
  { code: "BD", name: "Bangladesh" },
  { code: "BB", name: "Barbados" },
  { code: "BY", name: "Belarus" },
  { code: "BE", name: "Belgium" },
  { code: "BZ", name: "Belize" },
  { code: "BJ", name: "Benin" },
  { code: "BM", name: "Bermuda" },
  { code: "BT", name: "Bhutan" },
  { code: "BO", name: "Bolivia" },
  { code: "BQ", name: "Bonaire, Sint Eustatius and Saba" },
  { code: "BA", name: "Bosnia and Herzegovina" },
  { code: "BW", name: "Botswana" },
  { code: "BV", name: "Bouvet Island" },
  { code: "BR", name: "Brazil" },
  { code: "IO", name: "British Indian Ocean Territory" },
  { code: "BN", name: "Brunei" },
  { code: "BG", name: "Bulgaria" },
  { code: "BF", name: "Burkina Faso" },
  { code: "BI", name: "Burundi" },
  { code: "CV", name: "Cabo Verde" },
  { code: "KH", name: "Cambodia" },
  { code: "CM", name: "Cameroon" },
  { code: "CA", name: "Canada" },
  { code: "KY", name: "Cayman Islands" },
  { code: "CF", name: "Central African Republic" },
  { code: "TD", name: "Chad" },
  { code: "CL", name: "Chile" },
  { code: "CN", name: "China" },
  { code: "CX", name: "Christmas Island" },
  { code: "CC", name: "Cocos (Keeling) Islands" },
  { code: "CO", name: "Colombia" },
  { code: "KM", name: "Comoros" },
  { code: "CG", name: "Congo" },
  { code: "CD", name: "Congo, Democratic Republic of the" },
  { code: "CK", name: "Cook Islands" },
  { code: "CR", name: "Costa Rica" },
  { code: "CI", name: "Côte d'Ivoire" },
  { code: "HR", name: "Croatia" },
  { code: "CU", name: "Cuba" },
  { code: "CW", name: "Curaçao" },
  { code: "CY", name: "Cyprus" },
  { code: "CZ", name: "Czechia" },
  { code: "DK", name: "Denmark" },
  { code: "DJ", name: "Djibouti" },
  { code: "DM", name: "Dominica" },
  { code: "DO", name: "Dominican Republic" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egypt" },
  { code: "SV", name: "El Salvador" },
  { code: "GQ", name: "Equatorial Guinea" },
  { code: "ER", name: "Eritrea" },
  { code: "EE", name: "Estonia" },
  { code: "SZ", name: "Eswatini" },
  { code: "ET", name: "Ethiopia" },
  { code: "FK", name: "Falkland Islands" },
  { code: "FO", name: "Faroe Islands" },
  { code: "FJ", name: "Fiji" },
  { code: "FI", name: "Finland" },
  { code: "FR", name: "France" },
  { code: "GF", name: "French Guiana" },
  { code: "PF", name: "French Polynesia" },
  { code: "TF", name: "French Southern Territories" },
  { code: "GA", name: "Gabon" },
  { code: "GM", name: "Gambia" },
  { code: "GE", name: "Georgia" },
  { code: "DE", name: "Germany" },
  { code: "GH", name: "Ghana" },
  { code: "GI", name: "Gibraltar" },
  { code: "GR", name: "Greece" },
  { code: "GL", name: "Greenland" },
  { code: "GD", name: "Grenada" },
  { code: "GP", name: "Guadeloupe" },
  { code: "GU", name: "Guam" },
  { code: "GT", name: "Guatemala" },
  { code: "GG", name: "Guernsey" },
  { code: "GN", name: "Guinea" },
  { code: "GW", name: "Guinea-Bissau" },
  { code: "GY", name: "Guyana" },
  { code: "HT", name: "Haiti" },
  { code: "HN", name: "Honduras" },
  { code: "HK", name: "Hong Kong" },
  { code: "HU", name: "Hungary" },
  { code: "IS", name: "Iceland" },
  { code: "IN", name: "India" },
  { code: "ID", name: "Indonesia" },
  { code: "IR", name: "Iran" },
  { code: "IQ", name: "Iraq" },
  { code: "IE", name: "Ireland" },
  { code: "IM", name: "Isle of Man" },
  { code: "IL", name: "Israel" },
  { code: "IT", name: "Italy" },
  { code: "JM", name: "Jamaica" },
  { code: "JP", name: "Japan" },
  { code: "JE", name: "Jersey" },
  { code: "JO", name: "Jordan" },
  { code: "KZ", name: "Kazakhstan" },
  { code: "KE", name: "Kenya" },
  { code: "KI", name: "Kiribati" },
  { code: "KW", name: "Kuwait" },
  { code: "KG", name: "Kyrgyzstan" },
  { code: "LA", name: "Laos" },
  { code: "LV", name: "Latvia" },
  { code: "LB", name: "Lebanon" },
  { code: "LS", name: "Lesotho" },
  { code: "LR", name: "Liberia" },
  { code: "LY", name: "Libya" },
  { code: "LI", name: "Liechtenstein" },
  { code: "LT", name: "Lithuania" },
  { code: "LU", name: "Luxembourg" },
  { code: "MO", name: "Macao" },
  { code: "MG", name: "Madagascar" },
  { code: "MW", name: "Malawi" },
  { code: "MY", name: "Malaysia" },
  { code: "MV", name: "Maldives" },
  { code: "ML", name: "Mali" },
  { code: "MT", name: "Malta" },
  { code: "MH", name: "Marshall Islands" },
  { code: "MQ", name: "Martinique" },
  { code: "MR", name: "Mauritania" },
  { code: "MU", name: "Mauritius" },
  { code: "YT", name: "Mayotte" },
  { code: "MX", name: "Mexico" },
  { code: "FM", name: "Micronesia" },
  { code: "MD", name: "Moldova" },
  { code: "MC", name: "Monaco" },
  { code: "MN", name: "Mongolia" },
  { code: "ME", name: "Montenegro" },
  { code: "MS", name: "Montserrat" },
  { code: "MA", name: "Morocco" },
  { code: "MZ", name: "Mozambique" },
  { code: "MM", name: "Myanmar" },
  { code: "NA", name: "Namibia" },
  { code: "NR", name: "Nauru" },
  { code: "NP", name: "Nepal" },
  { code: "NL", name: "Netherlands" },
  { code: "NC", name: "New Caledonia" },
  { code: "NZ", name: "New Zealand" },
  { code: "NI", name: "Nicaragua" },
  { code: "NE", name: "Niger" },
  { code: "NG", name: "Nigeria" },
  { code: "NU", name: "Niue" },
  { code: "NF", name: "Norfolk Island" },
  { code: "KP", name: "North Korea" },
  { code: "MK", name: "North Macedonia" },
  { code: "MP", name: "Northern Mariana Islands" },
  { code: "NO", name: "Norway" },
  { code: "OM", name: "Oman" },
  { code: "PK", name: "Pakistan" },
  { code: "PW", name: "Palau" },
  { code: "PS", name: "Palestine" },
  { code: "PA", name: "Panama" },
  { code: "PG", name: "Papua New Guinea" },
  { code: "PY", name: "Paraguay" },
  { code: "PE", name: "Peru" },
  { code: "PH", name: "Philippines" },
  { code: "PN", name: "Pitcairn" },
  { code: "PL", name: "Poland" },
  { code: "PT", name: "Portugal" },
  { code: "PR", name: "Puerto Rico" },
  { code: "QA", name: "Qatar" },
  { code: "RE", name: "Réunion" },
  { code: "RO", name: "Romania" },
  { code: "RU", name: "Russia" },
  { code: "RW", name: "Rwanda" },
  { code: "BL", name: "Saint Barthélemy" },
  { code: "SH", name: "Saint Helena" },
  { code: "KN", name: "Saint Kitts and Nevis" },
  { code: "LC", name: "Saint Lucia" },
  { code: "MF", name: "Saint Martin" },
  { code: "PM", name: "Saint Pierre and Miquelon" },
  { code: "VC", name: "Saint Vincent and the Grenadines" },
  { code: "WS", name: "Samoa" },
  { code: "SM", name: "San Marino" },
  { code: "ST", name: "São Tomé and Príncipe" },
  { code: "SA", name: "Saudi Arabia" },
  { code: "SN", name: "Senegal" },
  { code: "RS", name: "Serbia" },
  { code: "SC", name: "Seychelles" },
  { code: "SL", name: "Sierra Leone" },
  { code: "SG", name: "Singapore" },
  { code: "SX", name: "Sint Maarten" },
  { code: "SK", name: "Slovakia" },
  { code: "SI", name: "Slovenia" },
  { code: "SB", name: "Solomon Islands" },
  { code: "SO", name: "Somalia" },
  { code: "ZA", name: "South Africa" },
  { code: "GS", name: "South Georgia and the South Sandwich Islands" },
  { code: "KR", name: "South Korea" },
  { code: "SS", name: "South Sudan" },
  { code: "ES", name: "Spain" },
  { code: "LK", name: "Sri Lanka" },
  { code: "SD", name: "Sudan" },
  { code: "SR", name: "Suriname" },
  { code: "SJ", name: "Svalbard and Jan Mayen" },
  { code: "SE", name: "Sweden" },
  { code: "CH", name: "Switzerland" },
  { code: "SY", name: "Syria" },
  { code: "TW", name: "Taiwan" },
  { code: "TJ", name: "Tajikistan" },
  { code: "TZ", name: "Tanzania" },
  { code: "TH", name: "Thailand" },
  { code: "TL", name: "Timor-Leste" },
  { code: "TG", name: "Togo" },
  { code: "TK", name: "Tokelau" },
  { code: "TO", name: "Tonga" },
  { code: "TT", name: "Trinidad and Tobago" },
  { code: "TN", name: "Tunisia" },
  { code: "TR", name: "Türkiye" },
  { code: "TM", name: "Turkmenistan" },
  { code: "TC", name: "Turks and Caicos Islands" },
  { code: "UG", name: "Uganda" },
  { code: "UA", name: "Ukraine" },
  { code: "AE", name: "United Arab Emirates" },
  { code: "GB", name: "United Kingdom" },
  { code: "US", name: "United States" },
  { code: "UM", name: "United States Minor Outlying Islands" },
  { code: "UY", name: "Uruguay" },
  { code: "UZ", name: "Uzbekistan" },
  { code: "VU", name: "Vanuatu" },
  { code: "VA", name: "Vatican City" },
  { code: "VE", name: "Venezuela" },
  { code: "VN", name: "Vietnam" },
  { code: "VG", name: "Virgin Islands, British" },
  { code: "VI", name: "Virgin Islands, U.S." },
  { code: "WF", name: "Wallis and Futuna" },
  { code: "EH", name: "Western Sahara" },
  { code: "YE", name: "Yemen" },
  { code: "ZM", name: "Zambia" },
  { code: "ZW", name: "Zimbabwe" },
];

export const COUNTRY_CODES: readonly string[] = COUNTRIES.map((c) => c.code);

const COUNTRY_NAME_BY_CODE: ReadonlyMap<string, string> = new Map(
  COUNTRIES.map((c) => [c.code, c.name]),
);

export function isCountryCode(value: unknown): value is string {
  return typeof value === "string" && COUNTRY_NAME_BY_CODE.has(value);
}

export function countryNameOf(code: string | null | undefined): string | null {
  if (!code) return null;
  return COUNTRY_NAME_BY_CODE.get(code) ?? null;
}

/* --------------------- cuisine tag -> country -------------------- */

/**
 * The cuisine-tag -> country mapping, in ONE place. A dish wave
 * that tags a whole file with one country's cuisine (the Kerala
 * precedent; the Bulgarian wave's "bulgaria") lands in that
 * country's shelf by adding its line here — and only here.
 */
export const CUISINE_COUNTRY: Readonly<Record<string, string>> = {
  india: "IN",
  kerala: "IN",
  bulgaria: "BG",
};

/* ----------------- international dish name markers ---------------- */

/**
 * Curated name markers placing "international" dishes to exactly
 * one country, matched over `dish.id + " " + dish.name.en`
 * (lowercased) with the regions.ts boundary rule: a marker counts
 * only where the character before it is not a letter, so "greek"
 * never fires inside "fenugreek". A dish matching two countries is
 * unplaced (three such dishes today — Ghanaian jollof, nasi lemak,
 * an Armenian lahmacun — all genuinely cross-border).
 */
export const COUNTRY_DISH_MARKERS: Readonly<Record<string, readonly string[]>> = {
  AF: ["afghan", "kabuli", "ashak", "kabul"],
  AM: ["armenian", "khorovats", "tolma", "ghapama", "yerevan"],
  AR: ["argentinian", "argentine", "chimichurri", "buenos"],
  AT: ["austrian", "tafelspitz", "kaiserschmarrn", "strudel", "linzer", "sachertorte", "vienna", "viennese"],
  BD: ["dhaka", "ilish", "morog"],
  BE: ["belgian", "stoofvlees", "waterzooi", "brussels", "flemish"],
  BG: ["bulgarian", "shopska", "tarator", "banitsa", "kavarma", "gyuvech", "kyufte", "kebapche", "mekitsi", "tikvenik", "lyutenitsa", "sofia"],
  BR: ["brazilian", "feijoada", "moqueca", "acaraje", "pao de queijo", "brigadeiro", "farofa", "vatapa", "xinxim", "bahia", "churrasco"],
  CH: ["swiss", "fondue", "raclette", "rosti"],
  CL: ["chilean", "pastel de choclo"],
  CN: ["chinese", "kung pao", "mapo", "dan dan", "char siu", "congee", "jiaozi", "wonton", "szechuan", "sichuan", "cantonese", "baozi", "mantou", "zongzi", "beijing", "shanghai", "chow mein", "chop suey"],
  CO: ["colombian", "bandeja paisa", "ajiaco"],
  CU: ["cuban", "ropa vieja", "moros y", "havana"],
  CZ: ["czech", "svickova", "prague", "bohemian"],
  DE: ["german", "schnitzel", "sauerbraten", "rouladen", "spaetzle", "bratwurst", "currywurst", "eisbein", "labskaus", "konigsberger", "bavarian", "berlin"],
  DK: ["danish", "smorrebrod", "stegt"],
  EG: ["egyptian", "koshari", "ful medames", "mahshi", "molokhia", "cairo"],
  ES: ["spanish", "paella", "gazpacho", "fabada", "cocido", "gambas al ajillo", "patatas bravas", "pisto", "escalivada", "fideua", "catalan", "valencia", "churros", "ajillo", "salmorejo"],
  ET: ["ethiopian", "injera", "tibs", "doro wat", "kitfo", "shiro", "misir", "gomen", "atkilt", "berbere", "addis"],
  FI: ["finnish", "lohikeitto", "helsinki"],
  FR: ["french", "ratatouille", "bouillabaisse", "coq au vin", "bourguignon", "cassoulet", "confit", "quiche", "croque", "souffle", "veloute", "provencal", "nicoise", "dauphinois", "blanquette", "navarin", "pot-au-feu", "paris", "lyon", "bisque"],
  GB: ["british", "english", "shepherd", "cottage pie", "yorkshire", "scottish", "haggis", "welsh", "bubble and squeak", "toad in the hole", "fish and chips", "ploughman", "kedgeree", "london"],
  GE: ["georgian", "khachapuri", "khinkali", "kharcho", "satsivi", "pkhali", "lobio", "mchadi", "chakapuli", "shkmeruli", "ostri", "ajapsandali", "tbilisi"],
  GH: ["ghanaian", "waakye", "kelewele", "banku", "accra"],
  GR: ["greek", "souvlaki", "moussaka", "tzatziki", "spanakopita", "gyro", "feta", "halloumi", "dolmades", "pastitsio", "stifado", "avgolemono", "fasolada", "horiatiki", "kleftiko", "saganaki", "loukoumades", "tiropita", "keftedes", "gemista", "briam", "gigantes", "skordalia", "taramasalata", "revithia", "fakes", "spanakorizo", "plaki", "soutzoukakia", "bougatsa", "athens", "aegean"],
  HK: ["hong kong"],
  HR: ["croatian", "zagreb", "pasticada"],
  HU: ["hungarian", "goulash", "paprikash", "langos", "halaszle", "lecso", "porkolt", "fozelek", "budapest"],
  ID: ["rendang", "nasi goreng", "nasi", "gado", "soto", "bakso", "mie goreng", "pepes", "sambal", "kecap", "opor", "sayur", "urap", "lawar", "perkedel", "martabak", "indonesian"],
  IE: ["irish", "colcannon", "boxty", "coddle", "soda bread", "dublin"],
  IL: ["israeli", "sabich", "jerusalem", "tel aviv"],
  IQ: ["iraqi", "masgouf", "baghdad"],
  IR: ["persian", "iranian", "ghormeh", "fesenjan", "tahdig", "ash reshteh", "zereshk", "koobideh", "tehran"],
  IT: ["italian", "spaghetti", "penne", "fusilli", "risotto", "gnocchi", "bruschetta", "caprese", "parmigiana", "saltimbocca", "osso buco", "minestrone", "pesto", "carbonara", "arrabbiata", "puttanesca", "cacciatore", "piccata", "marsala", "tiramisu", "panna cotta", "polenta", "ribollita", "panzanella", "pasta"],
  JM: ["jamaican", "jerk", "ackee", "callaloo", "escovitch", "kingston"],
  JO: ["jordanian", "mansaf"],
  JP: ["japanese", "sushi", "sashimi", "miso", "teriyaki", "donburi", "katsudon", "oyakodon", "ramen", "udon", "soba", "tempura", "okonomiyaki", "takoyaki", "shabu", "sukiyaki", "tonkatsu", "karaage", "onigiri", "chazuke", "nimono", "sunomono", "agedashi", "nikujaga", "tokyo"],
  KE: ["kenyan", "ugali", "nyama choma", "sukuma", "nairobi"],
  KH: ["cambodian", "amok", "lok lak", "kuy teav", "nom banh chok", "phnom", "khmer"],
  KR: ["korean", "kimchi", "bibimbap", "bulgogi", "japchae", "tteokbokki", "samgyeopsal", "doenjang", "gochujang", "kimbap", "gimbap", "sundubu", "seolleongtang", "galbi", "jjigae", "bossam", "dakgalbi", "seoul"],
  LA: ["laotian", "vientiane"],
  LB: ["lebanese", "tabbouleh", "fattoush", "shish tawook", "kibbeh", "beirut", "manoushe"],
  LK: ["sri lankan", "kottu", "hoppers", "kiribath", "pol roti", "lamprais", "colombo", "ceylon"],
  MA: ["moroccan", "tagine", "harira", "chermoula", "ras el hanout", "pastilla", "msemen", "baghrir", "chebakia", "tanjia", "rfissa", "zaalouk", "bissara"],
  MM: ["burmese", "mohinga", "yangon"],
  MX: ["taco", "burrito", "enchilada", "quesadilla", "pozole", "chilaquiles", "elote", "carnitas", "al pastor", "guacamole", "pico de gallo", "tamale", "tostada", "mexican", "chipotle", "salsa verde", "mole"],
  MY: ["malaysian", "nasi lemak", "laksa", "roti canai", "kuala", "penang"],
  NG: ["nigerian", "jollof", "egusi", "suya", "akara", "moi moi", "efo riro", "ogbono", "afang", "edikang", "puff puff", "lagos"],
  NL: ["dutch", "stamppot", "hutspot", "erwtensoep", "amsterdam"],
  NO: ["norwegian", "farikal", "oslo"],
  NP: ["nepali", "sel roti", "gundruk", "kathmandu", "thukpa"],
  PE: ["peruvian", "ceviche", "lomo saltado", "aji de gallina", "anticuchos", "causa", "huancaina", "lima"],
  PH: ["filipino", "sinigang", "kare-kare", "lechon", "pancit", "lumpia", "sisig", "tinola", "pinakbet", "laing", "bicol express", "manila"],
  PK: ["pakistani", "nihari", "haleem", "chapli", "lahore", "karachi"],
  PL: ["polish", "pierogi", "bigos", "zurek", "golabki", "kotlet", "schabowy", "barszcz", "kielbasa", "placki", "rosol", "warsaw", "krakow"],
  PS: ["musakhan"],
  PT: ["portuguese", "bacalhau", "caldo verde", "francesinha", "bifana", "piri piri", "pastel de nata", "lisbon", "porto", "cataplana", "cozido"],
  RO: ["romanian", "mamaliga", "sarmale", "mititei", "ciorba", "bucharest"],
  RS: ["serbian", "cevapi", "pljeskavica", "ajvar", "gibanica", "prebranac", "belgrade"],
  RU: ["russian", "pelmeni", "solyanka", "stroganoff", "moscow"],
  SE: ["swedish", "gravlax", "kottbullar", "janssons", "raggmunk", "kroppkakor", "stockholm", "lingonberry"],
  SG: ["singaporean", "hainanese"],
  SY: ["syrian"],
  TH: ["thai", "tom yum", "tom kha", "pad see", "pad kra", "som tam", "larb", "massaman", "panang", "khao", "gai yang", "tod mun", "bangkok"],
  TR: ["turkish", "adana", "iskender", "pide", "lahmacun", "menemen", "imam bayildi", "karniyarik", "hunkar", "ezogelin", "mercimek", "doner", "kunefe", "ayran", "cacik", "borek", "manti", "ottoman", "anatolian"],
  TW: ["taiwanese", "taipei"],
  UA: ["ukrainian", "borscht", "varenyky", "holubtsi", "kyiv"],
  US: ["american", "new york", "cajun", "jambalaya", "gumbo", "southern", "buffalo", "philly", "clam chowder", "meatloaf", "sloppy", "kansas", "memphis", "carolina", "texas"],
  VN: ["vietnamese", "pho", "banh mi", "banh xeo", "goi cuon", "bun cha", "bun bo", "com tam", "cha ca", "cao lau", "mi quang", "hu tieu", "bo kho", "canh chua", "hanoi", "saigon"],
  YE: ["saltah", "fahsa", "yemeni", "sanaa"],
  ZA: ["bobotie", "bunny chow", "boerewors", "potjiekos", "malva"],};

/* ----------------------- India's side markers --------------------- */

/** Markers for the Indian sides regions.ts does not derive. North
 *  and South come from dishRegion; these tables are consulted only
 *  for dishes of India, and a dish signalling two different sides
 *  (region included) is honestly side-less. */
export const INDIA_SIDE_MARKERS: Readonly<
  Record<"east_indian" | "west_indian" | "central_indian" | "north_east_indian", readonly string[]>
> = {
  west_indian: ["goan", "goa ", "konkan", "maharashtrian", "maharashtra", "mumbai", "bombay", "gujarati", "gujarat", "kathiyawadi", "sindhi", "parsi", "kolhapuri", "malvani", "vindaloo", "xacuti", "cafreal", "sorpotel", "pav bhaji", "vada pav", "misal", "dhokla", "khandvi", "thepla", "undhiyu", "handvo", "shrikhand"],
  east_indian: ["bengali", "bengal", "kolkata", "calcutta", "odia", "odisha", "macher", "kosha", "shorshe", "chingri", "luchi", "mishti", "sandesh", "rasgulla", "rasogolla", "champaran", "litti", "sattu", "bihari"],
  central_indian: ["madhya", "indore", "bhopal", "chhattisgarhi", "bafla", "fara"],
  north_east_indian: ["assamese", "assam", "naga", "manipuri", "meghalaya", "mizoram", "mizo", "tripura", "arunachal", "sikkimese", "sikkim", "jadoh"],
};

/** The sides the Assessment OFFERS per country. Only India has
 *  sides in the data; every other country is one pool and gets no
 *  side question at all. Central and North-East are measured too
 *  thin to offer (3 and 1 dishes) — see the header. */
export const COUNTRY_FOOD_SIDES: Readonly<Record<string, readonly FoodSide[]>> = {
  IN: ["north_indian", "south_indian", "east_indian", "west_indian"],
};

export function foodSidesForCountry(code: string | null | undefined): readonly FoodSide[] {
  if (!code) return [];
  return COUNTRY_FOOD_SIDES[code] ?? [];
}

/* --------------------------- placement ---------------------------- */

function markerHit(text: string, marker: string): boolean {
  let i = text.indexOf(marker);
  while (i !== -1) {
    if (i === 0 || !/[a-z]/.test(text[i - 1]!)) return true;
    i = text.indexOf(marker, i + 1);
  }
  return false;
}

function dishText(dish: Dish): string {
  return `${dish.id} ${dish.name.en}`.toLowerCase();
}

/**
 * The country a dish belongs to, or null when it honestly belongs
 * to none: a cuisine tag mapped in CUISINE_COUNTRY decides first;
 * an "international" dish is placed by name markers, and only when
 * exactly one country claims it.
 */
export function dishCountry(dish: Dish): string | null {
  const tag = (dish.cuisine ?? "").toLowerCase();
  const byTag = CUISINE_COUNTRY[tag];
  if (byTag !== undefined) return byTag;
  /* A user dish tagged with a finer Indian cuisine ("north-indian")
     names its country in the tag itself — that is the tag speaking,
     not a guess. Any other unmapped tag, and no tag at all, belongs
     to no country. */
  if (tag.includes("india") || tag === "kerala") return "IN";
  if (tag !== "international") return null;
  const text = dishText(dish);
  let found: string | null = null;
  for (const [code, markers] of Object.entries(COUNTRY_DISH_MARKERS)) {
    if (markers.some((m) => markerHit(text, m))) {
      if (found !== null) return null;
      found = code;
    }
  }
  return found;
}

/**
 * The side of its country a dish belongs to, or null when it is
 * honestly side-less (pan-country dishes, and dishes signalling
 * two sides). Only India has sides; every other country's dishes
 * are side-less by definition.
 */
export function dishSide(dish: Dish): FoodSide | null {
  if (dishCountry(dish) !== "IN") return null;
  const signals = new Set<FoodSide>();
  const region = dishRegion(dish);
  if (region !== null) signals.add(region);
  const text = dishText(dish);
  for (const [side, markers] of Object.entries(INDIA_SIDE_MARKERS) as [
    FoodSide,
    readonly string[],
  ][]) {
    if (markers.some((m) => markerHit(text, m))) signals.add(side);
  }
  return signals.size === 1 ? [...signals][0]! : null;
}

/**
 * Is this dish on the shelf a person asked for? The country must
 * match. A chosen side keeps that side's dishes AND the country's
 * side-less dishes (the shared shelf — biryani belongs to no side);
 * what a side filters OUT is the other sides' dishes.
 */
export function dishOnShelf(
  dish: Dish,
  country: string,
  side: FoodSide | null,
): boolean {
  if (dishCountry(dish) !== country) return false;
  if (side === null) return true;
  const own = dishSide(dish);
  return own === null || own === side;
}
