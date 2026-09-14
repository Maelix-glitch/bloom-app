/**
 * Signature, wave two — editorial data-as-composition and more photo variety.
 *
 * Data templates read like a line of a journal ("LAST NIGHT / 7h 20m"), never a
 * dashboard. Photo compositions keep varying: window, small memory, triptych,
 * overlap, edge-to-edge, mosaic. Photo slots stay empty; copy stays original.
 */

import { data, photo, photoBg, shape, solid, sticker, text, tpl } from "../dsl";
import type { StoryTemplateDef } from "../dsl";

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

export const PREMIUM2_TEMPLATES: StoryTemplateDef[] = [
  tpl({
    id: "sig-first-light", name: "First Light", hint: "The day, before the day", category: "morning",
    tags: ["morning", "light", "one photo"], tone: "dark",
    background: photoBg("/bloom/templates/window-light.jpg", CHARCOAL),
    seeds: [
      text("06:12", 0.1, 0.09, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.62 }),
      text("first\nlight", 0.1, 0.18, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 1.2 }),
      photo(0.62, 0.62, 0.5, 0.4, { mask: "arch", z: 2, shadow: true, filterId: "warm" }),
    ],
  }),
  tpl({
    id: "sig-weather-inside", name: "Weather Inside", hint: "Name the mood, gently", category: "mood",
    tags: ["mood", "feelings", "data"], tone: "light",
    background: solid(MIST, CHARCOAL),
    storyKind: "mood",
    seeds: [
      text("weather\ninside", 0.12, 0.12, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.05 }),
      data("mood", 0.5, 0.5, { variant: "inline", accent: TERRACOTTA, w: 0.7, h: 0.12, z: 3 }),
      text("today felt soft", 0.5, 0.9, { z: 5, preset: "typewriter", color: TAUPE, size: 0.62, transform: "uppercase", tracking: 0.2 }),
    ],
  }),
  tpl({
    id: "sig-water-logged", name: "Water, Logged", hint: "Hydration as a quiet ritual", category: "hydration",
    tags: ["hydration", "water", "data"], tone: "light",
    background: solid(SOFT_BLUE, "#1F3A4A"),
    storyKind: "reflection",
    seeds: [
      text("drink\nyour\nwater", 0.14, 0.12, { z: 5, preset: "elegant", color: "#1F3A4A", align: "left", size: 1.0, leading: 1.1 }),
      data("water", 0.62, 0.5, { variant: "ring", accent: "#F4FAFC", w: 0.44, h: 0.22, z: 3 }),
      text("slow sips count", 0.5, 0.92, { z: 5, preset: "typewriter", color: "#1F3A4A", size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-moved-today", name: "Moved Today", hint: "Strength, set like type", category: "fitness",
    tags: ["movement", "strong", "data"], tone: "dark",
    background: solid(DEEP_FOREST, IVORY),
    storyKind: "reflection",
    seeds: [
      text("MOVED", 0.1, 0.12, { z: 5, preset: "condensed", color: IVORY, align: "left", size: 1.4, transform: "uppercase" }),
      data("movement", 0.1, 0.3, { variant: "bars", accent: SAGE, w: 0.7, h: 0.16, z: 3 }),
      photo(0.6, 0.72, 0.6, 0.4, { mask: "rect", z: 2, fit: "cover", filterId: "matte" }),
    ],
  }),
  tpl({
    id: "sig-in-phase", name: "In Phase", hint: "Your cycle, drawn softly", category: "cycle",
    tags: ["cycle", "phase", "data"], tone: "light",
    background: solid(DUSTY_ROSE, PLUM),
    storyKind: "reflection",
    seeds: [
      text("in\nphase", 0.14, 0.12, { z: 5, preset: "romantic", color: PLUM, align: "left", size: 1.1 }),
      data("cycle", 0.55, 0.52, { variant: "phase", accent: PLUM, w: 0.6, h: 0.26, z: 3 }),
      text("in tune with myself", 0.5, 0.92, { z: 5, preset: "typewriter", color: PLUM, size: 0.6, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-kept-my-word", name: "Kept My Word", hint: "Habits, honestly", category: "habits",
    tags: ["habits", "streak", "data"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    storyKind: "reflection",
    seeds: [
      text("kept my\nword", 0.12, 0.1, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 1.0 }),
      data("habits", 0.5, 0.5, { variant: "list", accent: SAGE, w: 0.74, h: 0.3, z: 3 }),
      text("slow is still moving", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-small-win-kept", name: "A Win, Kept", hint: "Write it down", category: "wins",
    tags: ["win", "proud", "one photo"], tone: "dark",
    background: solid(MIDNIGHT, IVORY),
    storyKind: "win",
    seeds: [
      text("something\ngood happened", 0.12, 0.12, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.05 }),
      photo(0.6, 0.6, 0.5, 0.4, { mask: "rect", frame: "polaroid", rotation: 3, z: 2, shadow: true }),
      sticker("doodle.hearts", 0.85, 0.2, { scale: 0.45, tint: CHAMPAGNE, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-desk-hours", name: "Desk Hours", hint: "Study, in warm light", category: "study",
    tags: ["study", "focus", "one photo"], tone: "light",
    background: photoBg("/bloom/templates/books-cozy.jpg", IVORY),
    storyKind: "reflection",
    seeds: [
      text("desk\nhours", 0.12, 0.12, { z: 5, preset: "typewriter", color: IVORY, align: "left", size: 0.9 }),
      data("study", 0.5, 0.42, { variant: "inline", accent: CHAMPAGNE, w: 0.6, h: 0.1, z: 3 }),
      photo(0.6, 0.72, 0.5, 0.34, { mask: "soft-corner", z: 2, shadow: true }),
    ],
  }),
  tpl({
    id: "sig-table-for-one", name: "Table for One", hint: "Food, photographed kindly", category: "food",
    tags: ["food", "meal", "one photo"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      text("table\nfor one", 0.12, 0.1, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 1.05 }),
      photo(0.55, 0.55, 0.6, 0.44, { mask: "circle", z: 2, shadow: true, filterId: "warm" }),
      text("nourish, don't rush", 0.5, 0.94, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-miles-maps", name: "Miles & Maps", hint: "A journey, ticketed", category: "travel",
    tags: ["travel", "map", "one photo"], tone: "light",
    background: solid(MIST, CHARCOAL),
    seeds: [
      text("MILES\n& MAPS", 0.12, 0.1, { z: 5, preset: "condensed", color: CHARCOAL, align: "left", size: 1.1, transform: "uppercase" }),
      photo(0.6, 0.5, 0.5, 0.34, { mask: "rect", frame: "window", rotation: -2, z: 2, shadow: true }),
      text("somewhere between here & there", 0.5, 0.92, { z: 5, preset: "typewriter", color: TAUPE, size: 0.58, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "sig-proof-of-life", name: "Proof of Life", hint: "Overlapping little truths", category: "memories",
    tags: ["memories", "polaroid", "two photos"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("proof\nof life", 0.14, 0.1, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.0 }),
      photo(0.42, 0.44, 0.46, 0.3, { mask: "rect", frame: "polaroid", rotation: -6, z: 2, shadow: true }),
      photo(0.62, 0.66, 0.46, 0.3, { mask: "rect", frame: "polaroid", rotation: 5, z: 3, shadow: true }),
      text("this was worth remembering", 0.5, 0.94, { z: 5, preset: "typewriter", color: TAUPE, size: 0.58, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "sig-us-lately", name: "Us, Lately", hint: "A love, in two frames", category: "love",
    tags: ["love", "couple", "two photos"], tone: "light",
    background: solid(DUSTY_ROSE, PLUM),
    seeds: [
      text("us,\nlately", 0.14, 0.1, { z: 5, preset: "romantic", color: PLUM, align: "left", size: 1.1 }),
      photo(0.62, 0.44, 0.44, 0.3, { mask: "oval", z: 2, shadow: true }),
      photo(0.42, 0.7, 0.44, 0.3, { mask: "oval", z: 3, shadow: true }),
      sticker("doodle.hearts", 0.85, 0.14, { scale: 0.45, tint: PLUM, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-thank-you-today", name: "Thank You, Today", hint: "Gratitude, one line", category: "gratitude",
    tags: ["gratitude", "thanks", "one photo"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      text("thank you,\ntoday", 0.12, 0.12, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.05 }),
      photo(0.6, 0.6, 0.5, 0.4, { mask: "blob", z: 2, shadow: true }),
      text("a fuller heart", 0.5, 0.94, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-pine-salt", name: "Pine & Salt", hint: "Forest meets ocean", category: "nature",
    tags: ["nature", "outdoors", "one photo"], tone: "dark",
    background: solid(DEEP_FOREST, IVORY),
    seeds: [
      text("pine\n& salt", 0.12, 0.12, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.1 }),
      photo(0.6, 0.6, 0.54, 0.44, { mask: "rect", z: 2, fit: "cover", filterId: "cool" }),
      text("breathe in", 0.5, 0.94, { z: 5, preset: "typewriter", color: SAGE, size: 0.6, transform: "uppercase", tracking: 0.24 }),
    ],
  }),
  tpl({
    id: "sig-almost-spring", name: "Almost Spring", hint: "A seasonal exhale", category: "seasonal",
    tags: ["seasonal", "spring", "flowers"], tone: "light",
    background: photoBg("/bloom/templates/daisy-cream.jpg", CHARCOAL),
    seeds: [
      text("almost\nspring", 0.14, 0.12, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.05 }),
      photo(0.62, 0.62, 0.46, 0.4, { mask: "soft-corner", z: 2, shadow: true }),
      text("another page", 0.5, 0.94, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.2 }),
    ],
  }),
  tpl({
    id: "sig-doodle-day", name: "Doodle Day", hint: "Playful, still premium", category: "playful",
    tags: ["playful", "doodle", "cute"], tone: "light",
    background: solid(TERRACOTTA, IVORY),
    seeds: [
      text("doodle\nday", 0.14, 0.12, { z: 5, preset: "playful", color: IVORY, align: "left", size: 1.1 }),
      photo(0.6, 0.56, 0.5, 0.36, { mask: "blob", z: 2, shadow: true }),
      sticker("doodle.circle", 0.82, 0.2, { scale: 0.6, tint: IVORY, z: 6 }),
      sticker("doodle.stars", 0.2, 0.86, { scale: 0.5, tint: CHAMPAGNE, z: 6 }),
    ],
  }),
  tpl({
    id: "sig-page-twelve", name: "Page Twelve", hint: "A journal, mid-thought", category: "quotes",
    tags: ["journal", "writing", "one photo"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("p. 12", 0.9, 0.08, { z: 5, preset: "typewriter", color: TAUPE, align: "right", size: 0.6 }),
      text("a little more\nlike myself", 0.12, 0.18, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 1.0, leading: 1.3 }),
      photo(0.6, 0.66, 0.46, 0.32, { mask: "rect", frame: "tape", rotation: 2, z: 2, shadow: true }),
    ],
  }),
  tpl({
    id: "sig-say-it-quiet", name: "Say It Quiet", hint: "One line, lots of air", category: "quotes",
    tags: ["quote", "minimal", "calm"], tone: "light",
    background: solid(MIST, CHARCOAL),
    seeds: [
      text("“one thing\nat a time.”", 0.5, 0.4, { z: 5, preset: "elegant", color: CHARCOAL, align: "center", size: 1.1, leading: 1.25 }),
      shape("rule-fade", 0.5, 0.62, 0.3, 0.012, { stroke: TAUPE, strokeWidth: 1, z: 1 }),
    ],
  }),
  tpl({
    id: "sig-nothing-much", name: "Nothing Much", hint: "Almost nothing, beautifully", category: "minimal",
    tags: ["minimal", "space", "one photo"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      photo(0.5, 0.42, 0.3, 0.3, { mask: "circle", z: 2 }),
      text("nothing much,\nand that's enough", 0.5, 0.82, { z: 5, preset: "minimal", color: CHARCOAL, align: "center", size: 0.8, leading: 1.4 }),
    ],
  }),
  tpl({
    id: "sig-night-shift", name: "Night Shift", hint: "Cinematic, after hours", category: "cinematic",
    tags: ["cinematic", "night", "dark"], tone: "dark",
    background: photoBg("/bloom/templates/neon-night.jpg", IVORY),
    seeds: [
      text("NIGHT\nSHIFT", 0.1, 0.12, { z: 5, preset: "cinematic", color: IVORY, align: "left", size: 1.2, transform: "uppercase" }),
      shape("rect", 0.5, 0.94, 1, 0.1, { fill: MIDNIGHT, z: 3 }),
      text("23:58", 0.9, 0.94, { z: 5, preset: "typewriter", color: CHAMPAGNE, align: "right", size: 0.6 }),
      photo(0.62, 0.56, 0.5, 0.4, { mask: "rect", z: 2, fit: "cover", filterId: "noir" }),
    ],
  }),
  tpl({
    id: "sig-triptych", name: "Triptych", hint: "Three panels, one feeling", category: "playful",
    tags: ["triptych", "three photos", "art"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      photo(0.2, 0.5, 0.26, 0.6, { mask: "rect", z: 2 }),
      photo(0.5, 0.5, 0.26, 0.6, { mask: "rect", z: 2 }),
      photo(0.8, 0.5, 0.26, 0.6, { mask: "rect", z: 2 }),
      text("TRIPTYCH", 0.5, 0.1, { z: 5, preset: "condensed", color: CHARCOAL, size: 0.9, transform: "uppercase", tracking: 0.2 }),
    ],
  }),
  tpl({
    id: "sig-window-seat", name: "Window Seat", hint: "Looking out, leaning in", category: "travel",
    tags: ["window", "travel", "one photo"], tone: "light",
    background: solid(MIST, CHARCOAL),
    seeds: [
      text("window\nseat", 0.14, 0.12, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 1.05 }),
      photo(0.58, 0.55, 0.46, 0.44, { mask: "arch", frame: "window", z: 2, shadow: true }),
      text("good places, good mood", 0.5, 0.94, { z: 5, preset: "typewriter", color: TAUPE, size: 0.58, transform: "uppercase", tracking: 0.14 }),
    ],
  }),
  tpl({
    id: "sig-one-small-thing", name: "One Small Thing", hint: "A tiny photo, huge calm", category: "selfcare",
    tags: ["self care", "small", "calm"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("one small\nthing", 0.12, 0.14, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.0 }),
      photo(0.7, 0.7, 0.24, 0.24, { mask: "rect", frame: "tape", rotation: 4, z: 2, shadow: true }),
      text("i chose myself", 0.12, 0.5, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6, transform: "uppercase", tracking: 0.16 }),
    ],
  }),
  tpl({
    id: "sig-edge-to-edge", name: "Edge to Edge", hint: "The photo runs past the frame", category: "memories",
    tags: ["full bleed", "edge", "one photo"], tone: "dark",
    background: solid(MIDNIGHT, IVORY),
    seeds: [
      photo(0.5, 0.4, 1, 0.8, { mask: "rect", z: 1, fit: "cover", filterId: "film" }),
      shape("vignette", 0.5, 0.5, 1, 1, { z: 2 }),
      text("let it stay", 0.08, 0.9, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.0, shadow: true }),
    ],
  }),
];
