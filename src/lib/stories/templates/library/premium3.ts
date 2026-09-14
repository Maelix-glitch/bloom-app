/**
 * Signature, wave three — the remaining visual worlds.
 *
 * Seasonal, celebration, cozy, life-lately, photo dump, currently,
 * dreams-and-future, growth-reset-rest, late-night, and quiet data. Same
 * editorial discipline as waves one and two: a dominant type voice, tiny
 * metadata, deliberate negative space, and a photo composition that differs
 * from its neighbours. Photo slots stay empty; the user supplies the image.
 */

import { data, gradient, photo, photoBg, shape, solid, sticker, text, tpl } from "../dsl";
import { linear } from "@/lib/stories/canvas/paint";
import type { StoryTemplateDef } from "../dsl";

/* Palette — carried from waves one and two, plus a few seasonal notes. */
const IVORY = "#F4EFE4";
const CHARCOAL = "#22201B";
const CHAMPAGNE = "#EED9A4";
const SAGE = "#9DB89A";
const DUSTY_ROSE = "#C9A2A2";
const LAVENDER = "#B9B2CE";
const MIDNIGHT = "#14111D";
const DEEP_FOREST = "#22301F";
const TERRACOTTA = "#C07A5E";
const WARM_BEIGE = "#E4D6C0";
const TAUPE = "#8A7F72";
const PLUM = "#4A2B3A";
const MIST = "#C9CFD6";
const SOFT_BLUE = "#AEC3D2";
const INK_BLUE = "#1F3A4A";
const AMBER = "#D9A05B";
const SNOW = "#E9EEF2";
const CREAM = "#F7F1E3";

export const PREMIUM3_TEMPLATES: StoryTemplateDef[] = [
  /* WORLD 16 — SEASONAL */
  tpl({
    id: "sig-rain-again", name: "Rain, Again", hint: "Monsoon light on the window", category: "seasonal",
    tags: ["seasonal", "rain", "monsoon", "one photo"], tone: "light",
    background: gradient(linear(180, [[0, "#DDE4E8"], [1, "#C4CED6"]]), INK_BLUE),
    seeds: [
      text("rain,\nagain", 0.13, 0.11, { z: 5, preset: "handwritten", color: INK_BLUE, align: "left", size: 1.15, leading: 1.1 }),
      photo(0.58, 0.5, 0.6, 0.42, { mask: "soft-corner", frame: "window", z: 2, shadow: true, filterId: "cool" }),
      text("stay in · make tea", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.2 }),
    ],
  }),
  tpl({
    id: "sig-long-light", name: "The Long Light", hint: "Long summer evenings", category: "seasonal",
    tags: ["seasonal", "summer", "golden", "one photo"], tone: "dark",
    background: photoBg("/bloom/templates/sunset-field.jpg", IVORY),
    seeds: [
      text("the long\nlight", 0.12, 0.13, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.05, shadow: true }),
      photo(0.5, 0.64, 0.84, 0.44, { mask: "rect", z: 2, fit: "cover", filterId: "golden" }),
      text("june, almost nine", 0.5, 0.92, { z: 5, preset: "typewriter", color: CHAMPAGNE, size: 0.6, transform: "uppercase", tracking: 0.22 }),
    ],
  }),
  tpl({
    id: "sig-turning-leaves", name: "Turning Leaves", hint: "Autumn, torn and taped", category: "seasonal",
    tags: ["seasonal", "autumn", "scrapbook", "one photo"], tone: "light",
    background: solid("#E8D9C3", CHARCOAL),
    seeds: [
      photo(0.5, 0.4, 0.56, 0.38, { mask: "torn", frame: "torn-paper", rotation: -3, z: 2, shadow: true }),
      text("turning\nleaves", 0.14, 0.72, { z: 5, preset: "journal", color: "#7A4A2B", align: "left", size: 1.0, leading: 1.2 }),
      sticker("season.leaf-fall", 0.8, 0.14, { scale: 0.6, tint: TERRACOTTA, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-first-snow", name: "First Snow", hint: "Cold air, warm room", category: "seasonal",
    tags: ["seasonal", "winter", "snow", "one photo"], tone: "light",
    background: solid(SNOW, INK_BLUE),
    seeds: [
      text("first snow", 0.5, 0.12, { z: 5, preset: "elegant", color: INK_BLUE, size: 1.1 }),
      photo(0.5, 0.52, 0.62, 0.44, { mask: "rect", frame: "mat", frameColor: "#FFFFFF", z: 2, shadow: true, filterId: "fade" }),
      sticker("season.snow", 0.82, 0.82, { scale: 0.45, tint: INK_BLUE, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-heat-wave", name: "Heat Wave", hint: "Nothing but sun", category: "seasonal",
    tags: ["seasonal", "summer", "sun", "type"], tone: "light",
    background: gradient(linear(20, [[0, "#F6E3C0"], [1, "#EDC98F"]]), "#6B4A22"),
    seeds: [
      text("HEAT", 0.5, 0.3, { z: 5, preset: "poster", color: "#6B4A22", size: 1.7, transform: "uppercase", tracking: 0.12 }),
      shape("sun", 0.5, 0.66, 0.5, 0.28, { fill: null, stroke: "#6B4A22", strokeWidth: 1.4, z: 3 }),
      text("stay cool, drink water", 0.5, 0.88, { z: 5, preset: "typewriter", color: "#6B4A22", size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-in-bloom", name: "In Bloom", hint: "Spring, framed in green", category: "seasonal",
    tags: ["seasonal", "spring", "flowers", "one photo"], tone: "light",
    background: photoBg("/bloom/templates/pink-blossom.jpg", PLUM),
    seeds: [
      text("in bloom", 0.5, 0.13, { z: 5, preset: "romantic", color: "#FFFFFF", size: 1.15, shadow: true }),
      photo(0.5, 0.56, 0.5, 0.44, { mask: "oval", frame: "mat", frameColor: "#FFFFFF", z: 2, shadow: true }),
      text("april 04", 0.5, 0.91, { z: 5, preset: "typewriter", color: "#FFFFFF", size: 0.58, transform: "uppercase", tracking: 0.24 }),
    ],
  }),

  /* WORLD 17 — CELEBRATION */
  tpl({
    id: "sig-level-up", name: "Level Up", hint: "A birthday, done dark", category: "playful",
    tags: ["birthday", "celebration", "dark", "one photo"], tone: "dark",
    background: solid(MIDNIGHT, IVORY),
    seeds: [
      text("24", 0.5, 0.18, { z: 5, preset: "editorial", color: CHAMPAGNE, size: 1.9 }),
      photo(0.5, 0.58, 0.64, 0.42, { mask: "arch", z: 2, fit: "cover" }),
      text("another lap, done beautifully", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-another-lap", name: "Another Trip Around", hint: "Sunlight and a wish", category: "love",
    tags: ["birthday", "celebration", "warm", "one photo"], tone: "light",
    background: solid(CHAMPAGNE, "#4A3A18"),
    seeds: [
      photo(0.5, 0.4, 0.52, 0.4, { mask: "circle", z: 2, shadow: true, border: { color: "#FFFFFF", width: 6 }, filterId: "warm" }),
      text("another trip\naround the sun", 0.12, 0.74, { z: 5, preset: "handwritten", color: "#4A3A18", align: "left", size: 0.95, leading: 1.2 }),
      sticker("party.popper", 0.82, 0.16, { scale: 0.55, tint: TERRACOTTA, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-cake-candles", name: "Cake & Candles", hint: "Make a wish, keep it small", category: "food",
    tags: ["birthday", "celebration", "cake", "one photo"], tone: "light",
    background: solid(CREAM, CHARCOAL),
    seeds: [
      text("make\na wish", 0.14, 0.1, { z: 5, preset: "handwritten", color: TERRACOTTA, align: "left", size: 1.1 }),
      photo(0.56, 0.52, 0.56, 0.4, { mask: "rounded", frame: "polaroid", rotation: 3, z: 2, shadow: true }),
      sticker("party.cake", 0.82, 0.86, { scale: 0.6, tint: DUSTY_ROSE, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-our-anniversary", name: "Our Anniversary", hint: "A letter for the two of you", category: "love",
    tags: ["anniversary", "love", "letter", "one photo"], tone: "light",
    background: solid(IVORY, PLUM),
    seeds: [
      text("three years,\nand counting", 0.12, 0.12, { z: 5, preset: "romantic", color: PLUM, align: "left", size: 0.95, leading: 1.25 }),
      photo(0.62, 0.62, 0.44, 0.44, { mask: "soft-corner", rotation: -2, z: 2, shadow: true, filterId: "soft" }),
      shape("heart", 0.2, 0.82, 0.1, 0.06, { fill: DUSTY_ROSE, z: 4 }),
    ],
  }),

  /* WORLD 18 — COZY / LIFE LATELY */
  tpl({
    id: "sig-slow-sunday", name: "Slow Sunday", hint: "Do less, feel more", category: "selfcare",
    tags: ["cozy", "sunday", "slow", "one photo"], tone: "light",
    background: photoBg("/bloom/templates/cozy-warm.jpg", IVORY),
    seeds: [
      text("slow\nsunday", 0.13, 0.12, { z: 5, preset: "handwritten", color: IVORY, align: "left", size: 1.2, shadow: true }),
      photo(0.58, 0.63, 0.48, 0.38, { mask: "rounded", frame: "tape", rotation: -2, z: 2, shadow: true }),
      text("nothing planned, on purpose", 0.5, 0.93, { z: 5, preset: "typewriter", color: WARM_BEIGE, size: 0.58, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-tea-hour", name: "Tea Hour", hint: "A quiet ritual, typed out", category: "selfcare",
    tags: ["cozy", "tea", "ritual", "one photo"], tone: "light",
    background: solid(SAGE, DEEP_FOREST),
    seeds: [
      text("TEA HOUR", 0.1, 0.08, { z: 5, preset: "condensed", color: DEEP_FOREST, align: "left", size: 1.0, transform: "uppercase", tracking: 0.08 }),
      photo(0.5, 0.42, 0.5, 0.34, { mask: "arch-soft", z: 2, shadow: true, filterId: "warm" }),
      sticker("well.tea", 0.84, 0.8, { scale: 0.5, tint: DEEP_FOREST, z: 6 }),
      text("steep · sip · stay", 0.5, 0.92, { z: 5, preset: "typewriter", color: DEEP_FOREST, size: 0.6, transform: "uppercase", tracking: 0.2 }),
    ],
  }),
  tpl({
    id: "sig-one-more-chapter", name: "One More Chapter", hint: "Books, blankets, late light", category: "study",
    tags: ["cozy", "reading", "books", "one photo"], tone: "dark",
    background: photoBg("/bloom/templates/books-cozy.jpg", IVORY),
    seeds: [
      text("one more\nchapter", 0.5, 0.14, { z: 5, preset: "journal", color: IVORY, size: 1.05, shadow: true }),
      photo(0.5, 0.58, 0.58, 0.4, { mask: "rect", frame: "mat", frameColor: "#2B241B", z: 2, shadow: true }),
      text("page 212", 0.5, 0.91, { z: 5, preset: "typewriter", color: WARM_BEIGE, size: 0.6, transform: "uppercase", tracking: 0.22 }),
    ],
  }),
  tpl({
    id: "sig-lately-in-photos", name: "Lately, In Photos", hint: "Four frames from this week", category: "memories",
    tags: ["photo dump", "lately", "four photos", "grid"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("lately", 0.1, 0.07, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 0.95 }),
      photo(0.29, 0.3, 0.38, 0.2, { mask: "rect", z: 2 }),
      photo(0.71, 0.32, 0.38, 0.2, { mask: "rect", z: 2, rotation: 2 }),
      photo(0.29, 0.58, 0.38, 0.2, { mask: "rect", z: 2, rotation: -2 }),
      photo(0.71, 0.6, 0.38, 0.2, { mask: "rect", z: 2 }),
      text("week 24 · keepers", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.58, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-shoebox", name: "The Shoebox", hint: "Prints scattered like memory", category: "scrapbook",
    tags: ["photo dump", "scrapbook", "prints", "three photos"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      text("the shoebox", 0.12, 0.09, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 0.95 }),
      photo(0.3, 0.34, 0.36, 0.26, { mask: "rect", frame: "polaroid", rotation: -6, z: 2, shadow: true }),
      photo(0.7, 0.42, 0.36, 0.26, { mask: "rect", frame: "polaroid", rotation: 5, z: 3, shadow: true }),
      photo(0.46, 0.7, 0.38, 0.26, { mask: "rect", frame: "polaroid", rotation: -2, z: 4, shadow: true }),
    ],
  }),
  tpl({
    id: "sig-photo-dump", name: "Camera Roll Dump", hint: "Unedited, unbothered", category: "playful",
    tags: ["photo dump", "camera roll", "five photos", "casual"], tone: "light",
    background: solid("#EFE7DA", CHARCOAL),
    seeds: [
      text("camera roll, unedited", 0.1, 0.06, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6, transform: "uppercase", tracking: 0.14 }),
      photo(0.32, 0.26, 0.4, 0.18, { mask: "rect", rotation: -3, z: 2, shadow: true }),
      photo(0.7, 0.28, 0.34, 0.16, { mask: "rect", rotation: 4, z: 3, shadow: true }),
      photo(0.28, 0.52, 0.34, 0.18, { mask: "rect", rotation: 2, z: 3, shadow: true }),
      photo(0.7, 0.54, 0.4, 0.18, { mask: "rect", rotation: -4, z: 2, shadow: true }),
      photo(0.5, 0.78, 0.44, 0.2, { mask: "rect", rotation: 1, z: 4, shadow: true }),
    ],
  }),
  tpl({
    id: "sig-a-roll-of-us", name: "A Roll of Us", hint: "A strip of the good parts", category: "memories",
    tags: ["film", "strip", "three photos", "nostalgia"], tone: "dark",
    background: solid("#1C1A16", IVORY),
    seeds: [
      text("a roll of us", 0.12, 0.07, { z: 5, preset: "handwritten", color: CHAMPAGNE, align: "left", size: 0.9 }),
      photo(0.5, 0.3, 0.68, 0.14, { mask: "rect", frame: "film", z: 2 }),
      photo(0.5, 0.5, 0.68, 0.14, { mask: "rect", frame: "film", z: 2 }),
      photo(0.5, 0.7, 0.68, 0.14, { mask: "rect", frame: "film", z: 2 }),
      text("frame 12 · 24 · 36", 0.5, 0.93, { z: 5, preset: "typewriter", color: TAUPE, size: 0.58, transform: "uppercase", tracking: 0.2 }),
    ],
  }),

  /* WORLD 19 — CURRENTLY */
  tpl({
    id: "sig-on-repeat", name: "On Repeat", hint: "What I'm playing lately", category: "playful",
    tags: ["currently", "music", "list", "type"], tone: "dark",
    background: solid("#211E2B", IVORY),
    seeds: [
      text("ON\nREPEAT", 0.1, 0.1, { z: 5, preset: "condensed", color: LAVENDER, align: "left", size: 1.25, transform: "uppercase" }),
      shape("line", 0.5, 0.4, 0.8, 0.006, { stroke: "#45405A", strokeWidth: 1, z: 1 }),
      text("one song, seventeen times", 0.1, 0.48, { z: 5, preset: "typewriter", color: IVORY, align: "left", size: 0.66 }),
      text("and I'd play it again", 0.1, 0.56, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.66 }),
    ],
  }),
  tpl({
    id: "sig-right-now-list", name: "The Right-Now List", hint: "Reading, watching, craving", category: "gratitude",
    tags: ["currently", "list", "journal", "three lines"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("right now", 0.12, 0.1, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 1.1 }),
      text("reading — a slow novel", 0.12, 0.34, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.72 }),
      text("watching — the rain", 0.12, 0.46, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.72 }),
      text("craving — something warm", 0.12, 0.58, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.72 }),
      shape("rule-fade", 0.5, 0.72, 0.76, 0.012, { stroke: MIST, strokeWidth: 1, z: 1 }),
      text("small joys, logged", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.2 }),
    ],
  }),
  tpl({
    id: "sig-in-my-head", name: "Living in My Head", hint: "The thought I keep returning to", category: "mood",
    tags: ["currently", "thoughts", "type", "minimal"], tone: "light",
    background: solid(LAVENDER, PLUM),
    storyKind: "reflection",
    seeds: [
      text("living rent-free\nin my head:", 0.12, 0.16, { z: 5, preset: "typewriter", color: PLUM, align: "left", size: 0.7, leading: 1.3 }),
      text("that one\nkind thing\nsomeone said", 0.12, 0.42, { z: 5, preset: "elegant", color: PLUM, align: "left", size: 1.0, leading: 1.18 }),
      shape("underline-hand", 0.4, 0.74, 0.5, 0.03, { stroke: PLUM, strokeWidth: 1.2, z: 3 }),
    ],
  }),

  /* WORLD 20 — DREAMS & FUTURE */
  tpl({
    id: "sig-letter-ahead", name: "A Letter, Ahead", hint: "Write to the you of later", category: "goals",
    tags: ["future", "letter", "goals", "one photo"], tone: "light",
    background: solid(CREAM, CHARCOAL),
    seeds: [
      text("dear future me,", 0.12, 0.12, { z: 5, preset: "handwritten", color: TERRACOTTA, align: "left", size: 0.95 }),
      photo(0.58, 0.44, 0.46, 0.34, { mask: "rect", frame: "polaroid", rotation: 2, z: 2, shadow: true }),
      text("i hope you kept\nthe soft parts", 0.12, 0.7, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.8, leading: 1.3 }),
    ],
  }),
  tpl({
    id: "sig-vision-page", name: "The Vision Page", hint: "One photo, three intentions", category: "goals",
    tags: ["future", "vision", "intentions", "one photo"], tone: "light",
    background: gradient(linear(160, [[0, "#F6F2E9"], [1, "#E7E0D0"]]), CHARCOAL),
    seeds: [
      text("THE VISION", 0.1, 0.07, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6, tracking: 0.3, transform: "uppercase" }),
      photo(0.5, 0.34, 0.66, 0.34, { mask: "arch", z: 2, fit: "cover" }),
      text("calmer mornings", 0.14, 0.62, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.7 }),
      text("one honest friendship", 0.14, 0.7, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.7 }),
      text("work that feels like mine", 0.14, 0.78, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.7 }),
    ],
  }),
  tpl({
    id: "sig-five-years", name: "Five Years From Now", hint: "Big type, bigger hope", category: "goals",
    tags: ["future", "dreams", "bold", "type"], tone: "dark",
    background: solid(DEEP_FOREST, IVORY),
    seeds: [
      text("FIVE\nYEARS", 0.1, 0.14, { z: 5, preset: "poster", color: IVORY, align: "left", size: 1.5, transform: "uppercase", leading: 0.95 }),
      shape("arrow-hand", 0.78, 0.42, 0.16, 0.16, { stroke: CHAMPAGNE, strokeWidth: 1.4, z: 3, rotation: -20 }),
      text("from now, I want to be\nsomeone who rests early", 0.1, 0.66, { z: 5, preset: "journal", color: SAGE, align: "left", size: 0.72, leading: 1.35 }),
    ],
  }),

  /* WORLD 21 — GROWTH / RESET / REST */
  tpl({
    id: "sig-becoming", name: "Becoming", hint: "Growth, set as a quiet page", category: "wellness",
    tags: ["growth", "wellness", "minimal", "type"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("becoming", 0.5, 0.3, { z: 5, preset: "editorial", color: CHARCOAL, size: 1.5 }),
      shape("rule-fade", 0.5, 0.44, 0.4, 0.012, { stroke: TAUPE, strokeWidth: 1, z: 1 }),
      text("slowly, and on my own terms", 0.5, 0.56, { z: 5, preset: "typewriter", color: TAUPE, size: 0.64, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-soft-reset", name: "Soft Reset", hint: "Start again, gently", category: "selfcare",
    tags: ["reset", "selfcare", "gentle", "one photo"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      photo(0.38, 0.3, 0.44, 0.3, { mask: "torn", frame: "torn-paper", rotation: -3, z: 2, shadow: true }),
      text("soft\nreset", 0.6, 0.64, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.1, leading: 1.1 }),
      text("begin again, no apology", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-art-of-nothing", name: "The Art of Nothing", hint: "Rest, defended", category: "sleep",
    tags: ["rest", "sleep", "permission", "type"], tone: "dark",
    background: solid(MIDNIGHT, IVORY),
    storyKind: "reflection",
    seeds: [
      text("the art of\ndoing nothing", 0.12, 0.2, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.1, leading: 1.2 }),
      shape("moon", 0.82, 0.14, 0.12, 0.08, { fill: CHAMPAGNE, z: 3 }),
      text("rest is not a reward.\nit is the work.", 0.12, 0.66, { z: 5, preset: "journal", color: LAVENDER, align: "left", size: 0.74, leading: 1.35 }),
    ],
  }),
  tpl({
    id: "sig-power-down", name: "Power Down", hint: "Tonight's sleep, beautifully", category: "sleep",
    tags: ["sleep", "night", "data", "calm"], tone: "dark",
    background: photoBg("/bloom/templates/night-moon.jpg", IVORY),
    storyKind: "reflection",
    seeds: [
      text("TONIGHT", 0.1, 0.08, { z: 5, preset: "typewriter", color: LAVENDER, align: "left", size: 0.6, tracking: 0.3, transform: "uppercase" }),
      text("power\ndown", 0.1, 0.18, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.15, leading: 1.05 }),
      data("sleep", 0.5, 0.56, { variant: "ring", accent: LAVENDER, w: 0.4, h: 0.2, z: 3 }),
      text("lights out at 23:00", 0.5, 0.92, { z: 5, preset: "typewriter", color: IVORY, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),

  /* WORLD 22 — LATE NIGHT */
  tpl({
    id: "sig-midnight-snack", name: "Midnight Snack", hint: "Kitchen light, 1 a.m.", category: "food",
    tags: ["night", "food", "late", "one photo"], tone: "dark",
    background: solid("#241F1A", IVORY),
    seeds: [
      text("01:14", 0.1, 0.07, { z: 5, preset: "typewriter", color: AMBER, align: "left", size: 0.62 }),
      text("midnight\nsnack", 0.1, 0.16, { z: 5, preset: "handwritten", color: IVORY, align: "left", size: 1.1 }),
      photo(0.6, 0.58, 0.56, 0.42, { mask: "rect", frame: "mat", frameColor: "#241F1A", z: 2, shadow: true, filterId: "warm" }),
    ],
  }),
  tpl({
    id: "sig-two-am", name: "Two A.M. Thoughts", hint: "The quiet, honest kind", category: "night",
    tags: ["night", "thoughts", "minimal", "type"], tone: "dark",
    background: solid("#191724", IVORY),
    storyKind: "reflection",
    seeds: [
      text("2:00 AM", 0.1, 0.07, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6 }),
      text("some thoughts\nonly arrive\nin the dark", 0.12, 0.24, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 0.95, leading: 1.25 }),
      shape("rule-fade", 0.3, 0.62, 0.4, 0.01, { stroke: "#3B3650", strokeWidth: 1, z: 1 }),
    ],
  }),
  tpl({
    id: "sig-moonlit", name: "Moonlit", hint: "One photo under a low moon", category: "night",
    tags: ["night", "moon", "dark", "one photo"], tone: "dark",
    background: gradient(linear(180, [[0, "#1B1A2E"], [1, "#0E0D18"]]), IVORY),
    seeds: [
      sticker("bloom.moon-1", 0.8, 0.12, { scale: 0.4, tint: CHAMPAGNE, z: 3 }),
      photo(0.5, 0.52, 0.72, 0.44, { mask: "arch-soft", z: 2, fit: "cover", filterId: "noir" }),
      text("moonlit", 0.5, 0.88, { z: 5, preset: "elegant", color: IVORY, size: 1.0 }),
    ],
  }),
  tpl({
    id: "sig-streetlight", name: "Streetlight Season", hint: "The city, softened", category: "cinematic",
    tags: ["night", "city", "cinematic", "one photo"], tone: "dark",
    background: photoBg("/bloom/templates/neon-night.jpg", IVORY),
    seeds: [
      text("streetlight\nseason", 0.12, 0.12, { z: 5, preset: "cinematic", color: IVORY, align: "left", size: 1.05, shadow: true }),
      photo(0.62, 0.63, 0.52, 0.4, { mask: "rect", z: 2, fit: "cover", filterId: "film" }),
      text("the city, but make it quiet", 0.5, 0.92, { z: 5, preset: "typewriter", color: MIST, size: 0.58, transform: "uppercase", tracking: 0.16 }),
    ],
  }),

  /* WORLD 23 — WELLNESS / HABITS / DATA, QUIETLY */
  tpl({
    id: "sig-body-battery", name: "Body Battery", hint: "Energy, as one honest line", category: "wellness",
    tags: ["wellness", "energy", "data", "minimal"], tone: "light",
    background: solid(MIST, INK_BLUE),
    storyKind: "reflection",
    seeds: [
      text("body\nbattery", 0.12, 0.12, { z: 5, preset: "elegant", color: INK_BLUE, align: "left", size: 1.05, leading: 1.1 }),
      data("energy", 0.5, 0.52, { variant: "bars", accent: INK_BLUE, w: 0.7, h: 0.2, z: 3 }),
      text("running on kindness today", 0.5, 0.9, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-one-quiet-goal", name: "One Quiet Goal", hint: "Not a list. One thing.", category: "goals",
    tags: ["goals", "minimal", "focus", "type"], tone: "light",
    background: solid(SAGE, DEEP_FOREST),
    seeds: [
      text("one quiet goal", 0.5, 0.14, { z: 5, preset: "typewriter", color: DEEP_FOREST, size: 0.62, transform: "uppercase", tracking: 0.24 }),
      text("walk\nbefore\nscreens", 0.5, 0.42, { z: 5, preset: "editorial", color: DEEP_FOREST, size: 1.25, leading: 1.05 }),
      shape("rule-fade", 0.5, 0.72, 0.3, 0.012, { stroke: DEEP_FOREST, strokeWidth: 1, z: 1 }),
      text("that's the whole plan", 0.5, 0.9, { z: 5, preset: "handwritten", color: DEEP_FOREST, size: 0.7 }),
    ],
  }),
  tpl({
    id: "sig-kept-going", name: "Kept Going", hint: "A streak, worn quietly", category: "habits",
    tags: ["habits", "streak", "data", "proud"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("KEPT\nGOING", 0.1, 0.12, { z: 5, preset: "condensed", color: CHARCOAL, align: "left", size: 1.3, transform: "uppercase" }),
      data("streak", 0.62, 0.44, { variant: "card", accent: TERRACOTTA, w: 0.4, h: 0.2, z: 3 }),
      text("no fireworks, just showing up", 0.5, 0.9, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-a-line-i-keep", name: "A Line I Keep", hint: "One sentence, lots of air", category: "quotes",
    tags: ["quote", "minimal", "type", "luxury"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      text("\u201Csoftness is\na strategy.\u201D", 0.12, 0.32, { z: 5, preset: "editorial", color: CHARCOAL, align: "left", size: 1.15, leading: 1.2 }),
      text("— a note to self", 0.12, 0.66, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6 }),
    ],
  }),
  tpl({
    id: "sig-soft-rules", name: "Soft Rules", hint: "Gentle laws to live by", category: "quotes",
    tags: ["quote", "rules", "list", "journal"], tone: "light",
    background: solid(CREAM, CHARCOAL),
    seeds: [
      text("soft rules", 0.12, 0.1, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 1.1 }),
      text("1 — rest before resentment", 0.12, 0.32, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.68 }),
      text("2 — one walk, daily", 0.12, 0.42, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.68 }),
      text("3 — tell them, don't hint", 0.12, 0.52, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 0.68 }),
      shape("rule-fade", 0.5, 0.68, 0.76, 0.012, { stroke: MIST, strokeWidth: 1, z: 1 }),
    ],
  }),
];
