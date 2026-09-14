/**
 * Signature — the premium, art-directed front of the library.
 *
 * Each design is composed like editorial artwork, not a card: a dominant type
 * voice paired with tiny metadata, deliberate negative space, and a photo
 * composition that is genuinely different from its neighbours (full-bleed,
 * arch, polaroid, film strip, torn paper, window, oval, diptych, hero,
 * contact sheet). Photo slots stay empty; the user supplies the image.
 */

import { data, gradient, photo, photoBg, preset, shape, solid, sticker, text, tpl } from "../dsl";
import { linear } from "@/lib/stories/canvas/paint";
import type { StoryTemplateDef } from "../dsl";

/* Palette — sophisticated relationships, no neon. */
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

export const PREMIUM_TEMPLATES: StoryTemplateDef[] = [
  /* WORLD 01 — LUXURY EDITORIAL */
  tpl({
    id: "sig-ivory-edition", name: "Edition No. 1", hint: "A magazine cover in warm ivory", category: "quotes",
    tags: ["editorial", "minimal", "luxury", "one photo"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("BLOOM", 0.08, 0.07, { z: 5, preset: "minimal", color: TAUPE, align: "left", size: 0.62, tracking: 0.34, transform: "uppercase" }),
      text("No. 01", 0.92, 0.07, { z: 5, preset: "typewriter", color: TAUPE, align: "right", size: 0.62 }),
      text("The\nQuiet\nIssue", 0.08, 0.2, { z: 5, preset: "editorial", color: CHARCOAL, align: "left", size: 1.5, leading: 1.02 }),
      shape("rule-fade", 0.5, 0.56, 0.84, 0.012, { stroke: TAUPE, strokeWidth: 1, z: 1 }),
      photo(0.5, 0.76, 0.62, 0.34, { mask: "rect", z: 2, fit: "cover" }),
      text("a study in stillness", 0.5, 0.955, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.22 }),
    ],
  }),
  tpl({
    id: "sig-margin", name: "Wide Margins", hint: "Almost nothing, on purpose", category: "minimal",
    tags: ["minimal", "luxury", "space", "one photo"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      text("keep\nthis\nmoment", 0.12, 0.14, { z: 5, preset: "elegant", color: CHARCOAL, align: "left", size: 1.05, leading: 1.15 }),
      photo(0.66, 0.62, 0.42, 0.42, { mask: "circle", z: 2, shadow: true }),
      text("— today", 0.12, 0.52, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6 }),
    ],
  }),

  /* WORLD 02 — CINEMATIC */
  tpl({
    id: "sig-chapter-one", name: "Opening Scene", hint: "A film title over darkness", category: "cinematic",
    tags: ["cinematic", "dark", "film", "one photo"], tone: "dark",
    background: solid(MIDNIGHT, IVORY),
    seeds: [
      photo(0.5, 0.42, 0.92, 0.5, { mask: "rect", z: 1, fit: "cover", filterId: "noir" }),
      shape("rect", 0.5, 0.06, 1, 0.12, { fill: MIDNIGHT, z: 3 }),
      shape("rect", 0.5, 0.94, 1, 0.12, { fill: MIDNIGHT, z: 3 }),
      text("CHAPTER 01", 0.5, 0.06, { z: 5, preset: "typewriter", color: CHAMPAGNE, size: 0.58, tracking: 0.3, transform: "uppercase" }),
      text("It began quietly", 0.5, 0.94, { z: 5, preset: "cinematic", color: IVORY, size: 0.9 }),
    ],
  }),
  tpl({
    id: "sig-last-reel", name: "Last Reel", hint: "A strip of the night", category: "cinematic",
    tags: ["cinematic", "film", "three photos", "dark"], tone: "dark",
    background: solid(CHARCOAL, IVORY),
    seeds: [
      text("LAST REEL", 0.1, 0.08, { z: 5, preset: "condensed", color: IVORY, align: "left", size: 1.1, transform: "uppercase", tracking: 0.06 }),
      photo(0.5, 0.3, 0.6, 0.16, { mask: "rect", frame: "film", z: 2 }),
      photo(0.5, 0.52, 0.6, 0.16, { mask: "rect", frame: "film", z: 2 }),
      photo(0.5, 0.74, 0.6, 0.16, { mask: "rect", frame: "film", z: 2 }),
      text("23:47", 0.9, 0.92, { z: 5, preset: "typewriter", color: TAUPE, align: "right", size: 0.6 }),
    ],
  }),

  /* WORLD 03 — SOFT ROMANTIC */
  tpl({
    id: "sig-blush-letter", name: "A Blush Letter", hint: "Handwritten over soft rose", category: "love",
    tags: ["love", "romantic", "soft", "one photo"], tone: "light",
    background: solid(DUSTY_ROSE, PLUM),
    seeds: [
      text("you,", 0.12, 0.1, { z: 5, preset: "handwritten", color: PLUM, align: "left", size: 1.3 }),
      text("always you", 0.12, 0.22, { z: 5, preset: "romantic", color: PLUM, align: "left", size: 0.9 }),
      photo(0.55, 0.6, 0.5, 0.4, { mask: "oval", z: 2, shadow: true, filterId: "soft" }),
      sticker("doodle.hearts", 0.84, 0.14, { scale: 0.5, tint: PLUM, z: 6 }),
    ],
  }),

  /* WORLD 04 — DARK MODERN */
  tpl({
    id: "sig-obsidian", name: "Obsidian", hint: "One word, one image, nothing else", category: "minimal",
    tags: ["dark", "modern", "bold", "one photo"], tone: "dark",
    background: solid("#0C0A12", IVORY),
    seeds: [
      text("STILL", 0.5, 0.16, { z: 5, preset: "poster", color: IVORY, size: 1.6, transform: "uppercase", tracking: 0.1 }),
      photo(0.5, 0.6, 0.7, 0.5, { mask: "rect", z: 2, fit: "cover", filterId: "matte" }),
      shape("rule-fade", 0.5, 0.34, 0.3, 0.012, { stroke: CHAMPAGNE, strokeWidth: 1, z: 3 }),
    ],
  }),

  /* WORLD 05 — SCRAPBOOK */
  tpl({
    id: "sig-kept-things", name: "Kept Things", hint: "Taped memories on linen", category: "scrapbook",
    tags: ["scrapbook", "polaroid", "tape", "two photos"], tone: "light",
    background: solid(WARM_BEIGE, CHARCOAL),
    seeds: [
      text("kept things", 0.14, 0.09, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 1.0 }),
      photo(0.36, 0.4, 0.44, 0.3, { mask: "rect", frame: "tape", rotation: -5, z: 2, shadow: true }),
      photo(0.64, 0.66, 0.44, 0.3, { mask: "rect", frame: "tape", rotation: 4, z: 3, shadow: true }),
      text("for the memory book", 0.5, 0.93, { z: 5, preset: "typewriter", color: TAUPE, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),
  tpl({
    id: "sig-paper-trail", name: "Paper Trail", hint: "Torn edges, honest moments", category: "scrapbook",
    tags: ["scrapbook", "torn", "photos", "paper"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("PAPER\nTRAIL", 0.12, 0.1, { z: 5, preset: "condensed", color: CHARCOAL, align: "left", size: 1.1, transform: "uppercase" }),
      photo(0.6, 0.42, 0.5, 0.3, { mask: "torn", frame: "torn-paper", rotation: 2, z: 2, shadow: true }),
      photo(0.4, 0.72, 0.5, 0.28, { mask: "torn", frame: "torn-paper", rotation: -3, z: 3, shadow: true }),
    ],
  }),

  /* WORLD 06 — NATURE */
  tpl({
    id: "sig-field-notes", name: "Field Notes", hint: "Botanical calm", category: "nature",
    tags: ["nature", "botanical", "calm", "one photo"], tone: "light",
    background: photoBg("/bloom/templates/dark-botanical.jpg", IVORY),
    seeds: [
      text("field\nnotes", 0.14, 0.12, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 1.1 }),
      photo(0.62, 0.58, 0.46, 0.36, { mask: "arch", z: 2, shadow: true }),
      text("grow slow", 0.5, 0.92, { z: 5, preset: "typewriter", color: SAGE, size: 0.6, transform: "uppercase", tracking: 0.24 }),
    ],
  }),

  /* WORLD 07 — JOURNAL */
  tpl({
    id: "sig-dated", name: "Dated", hint: "A typed page with a photo", category: "quotes",
    tags: ["journal", "typewriter", "date", "one photo"], tone: "light",
    background: solid(IVORY, CHARCOAL),
    seeds: [
      text("Sept 15", 0.1, 0.08, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.66 }),
      text("one beautiful\nordinary day", 0.1, 0.18, { z: 5, preset: "journal", color: CHARCOAL, align: "left", size: 1.0, leading: 1.25 }),
      photo(0.62, 0.6, 0.46, 0.34, { mask: "rect", frame: "polaroid", rotation: 3, z: 2, shadow: true }),
      shape("rule-fade", 0.4, 0.44, 0.6, 0.012, { stroke: MIST, strokeWidth: 1, z: 1 }),
    ],
  }),

  /* WORLD 08 — PHOTOBOOK */
  tpl({
    id: "sig-full-bleed", name: "Full Bleed", hint: "The photograph is the story", category: "memories",
    tags: ["photobook", "full bleed", "one photo"], tone: "dark",
    background: solid(MIDNIGHT, IVORY),
    seeds: [
      photo(0.5, 0.5, 1, 1, { mask: "rect", z: 1, fit: "cover" }),
      shape("vignette", 0.5, 0.5, 1, 1, { z: 2 }),
      text("here, for a while", 0.08, 0.9, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 0.95, shadow: true }),
      text("09 · 15", 0.92, 0.08, { z: 5, preset: "typewriter", color: IVORY, align: "right", size: 0.6 }),
    ],
  }),
  tpl({
    id: "sig-hero", name: "Hero", hint: "A dominant image, a whisper of type", category: "memories",
    tags: ["photobook", "hero", "one photo"], tone: "dark",
    background: solid(CHARCOAL, IVORY),
    seeds: [
      photo(0.5, 0.4, 0.9, 0.72, { mask: "rect", z: 1, fit: "cover", filterId: "warm" }),
      text("WORTH\nREMEMBERING", 0.1, 0.86, { z: 5, preset: "condensed", color: IVORY, align: "left", size: 1.1, transform: "uppercase", shadow: true }),
    ],
  }),

  /* WORLD 09 — TRAVEL EDITORIAL */
  tpl({
    id: "sig-postcard", name: "Wish You Were Here", hint: "Wish you were here", category: "travel",
    tags: ["travel", "postcard", "one photo"], tone: "light",
    background: solid(MIST, CHARCOAL),
    seeds: [
      photo(0.5, 0.42, 0.66, 0.44, { mask: "rect", frame: "mat", rotation: -2, z: 2, shadow: true }),
      text("wish you\nwere here", 0.16, 0.12, { z: 5, preset: "handwritten", color: CHARCOAL, align: "left", size: 0.95 }),
      text("SOMEWHERE · 41.9°N 12.5°E", 0.5, 0.93, { z: 5, preset: "typewriter", color: TAUPE, size: 0.56, transform: "uppercase", tracking: 0.14 }),
    ],
  }),

  /* WORLD 10 — WELLNESS (editorial, not dashboard) */
  tpl({
    id: "sig-last-night", name: "Slept Well", hint: "Rest, set beautifully", category: "sleep",
    tags: ["sleep", "rest", "data", "calm"], tone: "dark",
    background: photoBg("/bloom/templates/night-moon.jpg", IVORY),
    storyKind: "reflection",
    seeds: [
      text("LAST NIGHT", 0.1, 0.1, { z: 5, preset: "typewriter", color: LAVENDER, align: "left", size: 0.62, tracking: 0.26, transform: "uppercase" }),
      data("sleep", 0.1, 0.24, { variant: "inline", accent: LAVENDER, w: 0.6, h: 0.1, z: 3 }),
      text("rested", 0.1, 0.36, { z: 5, preset: "elegant", color: IVORY, align: "left", size: 0.9 }),
      photo(0.6, 0.72, 0.5, 0.36, { mask: "soft-corner", z: 2, shadow: true }),
    ],
  }),

  /* WORLD 12 — MONOCHROME */
  tpl({
    id: "sig-monochrome", name: "In Black & White", hint: "Black, white, and your photo", category: "minimal",
    tags: ["monochrome", "black and white", "one photo"], tone: "dark",
    background: solid("#111111", IVORY),
    seeds: [
      text("M", 0.1, 0.1, { z: 5, preset: "editorial", color: IVORY, align: "left", size: 1.4 }),
      photo(0.5, 0.55, 0.6, 0.5, { mask: "rect", z: 2, fit: "cover", filterId: "noir" }),
      shape("rule-fade", 0.5, 0.26, 0.8, 0.01, { stroke: "#555", strokeWidth: 1, z: 1 }),
    ],
  }),

  /* WORLD 13 — GOLDEN HOUR */
  tpl({
    id: "sig-golden", name: "Low Sun", hint: "Warm light, soft type", category: "nature",
    tags: ["golden", "sunset", "warm", "one photo"], tone: "dark",
    background: photoBg("/bloom/templates/dusk-sea.jpg", IVORY),
    seeds: [
      text("golden\nhour", 0.14, 0.12, { z: 5, preset: "handwritten", color: IVORY, align: "left", size: 1.15, shadow: true }),
      photo(0.6, 0.62, 0.5, 0.4, { mask: "arch", z: 2, shadow: true, filterId: "golden" }),
      text("let this moment stay", 0.5, 0.94, { z: 5, preset: "typewriter", color: CHAMPAGNE, size: 0.6, transform: "uppercase", tracking: 0.18 }),
    ],
  }),

  /* WORLD 15 — CONTEMPORARY ART */
  tpl({
    id: "sig-diptych", name: "Diptych", hint: "Two panels in conversation", category: "playful",
    tags: ["art", "diptych", "two photos", "bold"], tone: "light",
    background: solid(TERRACOTTA, IVORY),
    seeds: [
      photo(0.27, 0.4, 0.42, 0.6, { mask: "rect", z: 2 }),
      photo(0.73, 0.5, 0.42, 0.6, { mask: "rect", z: 3 }),
      text("TWO\nVIEWS", 0.5, 0.1, { z: 5, preset: "poster", color: IVORY, size: 1.0, transform: "uppercase" }),
    ],
  }),
  tpl({
    id: "sig-contact", name: "Contact Sheet", hint: "Six small frames, one story", category: "scrapbook",
    tags: ["contact sheet", "six photos", "grid"], tone: "dark",
    background: solid(CHARCOAL, IVORY),
    seeds: [
      text("CONTACT", 0.1, 0.07, { z: 5, preset: "typewriter", color: TAUPE, align: "left", size: 0.6, tracking: 0.24, transform: "uppercase" }),
      photo(0.27, 0.28, 0.4, 0.16, { mask: "rect", z: 2 }),
      photo(0.73, 0.28, 0.4, 0.16, { mask: "rect", z: 2 }),
      photo(0.27, 0.5, 0.4, 0.16, { mask: "rect", z: 2 }),
      photo(0.73, 0.5, 0.4, 0.16, { mask: "rect", z: 2 }),
      photo(0.27, 0.72, 0.4, 0.16, { mask: "rect", z: 2 }),
      photo(0.73, 0.72, 0.4, 0.16, { mask: "rect", z: 2 }),
    ],
  }),
];
