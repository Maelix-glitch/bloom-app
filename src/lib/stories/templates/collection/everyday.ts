/**
 * Everyday — ten compositions for ordinary days.
 *
 * The rule this collection is held to: no two templates here may share a
 * composition family. "Today" is a full-bleed photo with a hairline caption;
 * "Morning" is an arch on a gradient; "Night" is a letterbox. Someone
 * scrolling this shelf should see ten *different* ideas, not one idea at ten
 * sizes.
 */

import { photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const EVERYDAY_TEMPLATES = [
  /* 01 — Full-bleed photograph, caption held to a hairline at the foot. */
  tpl({
    id: "everyday-today",
    name: "Today",
    hint: "One photo, one line, nothing else.",
    category: "everyday",
    tags: ["photo", "minimal", "daily"],
    tone: "dark",
    background: flat(C.obsidian, INK_LIGHT),
    seeds: [
      photo(0.5, 0.45, 1, 0.78, { slot: "today-hero", fit: "cover", mask: "rect" }),
      shape("rule-fade", 0.5, 0.83, 0.34, 0.004, { fill: C.champagne, opacity: 70 }),
      text("Today", 0.5, 0.862, {
        preset: "minimal",
        color: C.ivory,
        size: 11,
        tracking: 0.3,
        transform: "uppercase",
      }),
    ],
  }),

  /* 02 — Editorial poster: left rule, stacked type, photo low and small. */
  tpl({
    id: "everyday-little-moment",
    name: "Little Moment",
    hint: "A small photo under a line of type.",
    category: "everyday",
    tags: ["editorial", "minimal", "photo"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      shape("line", 0.14, 0.15, 0.004, 0.2, { fill: C.charcoal, opacity: 45 }),
      text("A little\nmoment", 0.16, 0.24, {
        preset: "editorial",
        color: C.charcoal,
        align: "left",
        size: 40,
        leading: 1.02,
      }),
      photo(0.5, 0.62, 0.68, 0.42, { slot: "little-moment", mask: "soft-corner", fit: "cover" }),
      text("worth keeping", 0.5, 0.875, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.26,
        transform: "lowercase",
      }),
    ],
  }),

  /* 03 — Morning: an arch of photo on a soft two-stop wash. */
  tpl({
    id: "everyday-morning",
    name: "Morning",
    hint: "Soft light, arched photo.",
    category: "everyday",
    tags: ["morning", "soft", "photo"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.cloud],
        [1, C.peach],
      ]),
      INK_DARK,
    ),
    seeds: [
      photo(0.5, 0.45, 0.62, 0.56, { slot: "morning-arch", mask: "arch-soft", fit: "cover" }),
      text("Morning", 0.5, 0.8, {
        preset: "elegant",
        color: C.charcoal,
        size: 26,
        tracking: 0.02,
      }),
      text("slow start", 0.5, 0.855, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.24,
        transform: "uppercase",
      }),
    ],
  }),

  /* 04 — Night: cinematic letterbox, type in the black band. */
  tpl({
    id: "everyday-night",
    name: "Night",
    hint: "Cinematic band across the dark.",
    category: "everyday",
    tags: ["night", "cinematic", "dark"],
    tone: "dark",
    background: flat(C.obsidian, INK_LIGHT),
    seeds: [
      photo(0.5, 0.44, 1, 0.44, { slot: "night-band", fit: "cover", mask: "rect" }),
      shape("line", 0.5, 0.22, 1, 0.002, { fill: C.ivory, opacity: 18 }),
      shape("line", 0.5, 0.66, 1, 0.002, { fill: C.ivory, opacity: 18 }),
      text("Night", 0.5, 0.76, {
        preset: "cinematic",
        color: C.ivory,
        size: 30,
        tracking: 0.14,
        transform: "uppercase",
      }),
      text("the quiet hours", 0.5, 0.815, {
        preset: "whisper",
        color: C.grey,
        size: 12,
      }),
    ],
  }),

  /* 05 — Weekend: horizontal split, photo above a warm ground. */
  tpl({
    id: "everyday-weekend",
    name: "Weekend",
    hint: "Photo up top, warm space below.",
    category: "everyday",
    tags: ["weekend", "photo", "warm"],
    tone: "light",
    background: flat(C.beige, INK_DARK),
    seeds: [
      photo(0.5, 0.27, 1, 0.5, { slot: "weekend-top", fit: "cover", mask: "rect" }),
      text("Weekend", 0.5, 0.62, {
        preset: "display",
        color: C.charcoal,
        size: 34,
        tracking: 0.01,
      }),
      text("no plans, on purpose", 0.5, 0.685, {
        preset: "soft",
        color: C.charcoal,
        size: 13,
        opacity: 70,
      }),
      shape("dots-row", 0.5, 0.8, 0.3, 0.02, { fill: C.charcoal, opacity: 22 }),
    ],
  }),

  /* 06 — Out & About: tall offset photo, caption running up the side. */
  tpl({
    id: "everyday-out-and-about",
    name: "Out & About",
    hint: "Tall photo, caption down the side.",
    category: "everyday",
    tags: ["travel", "photo", "editorial"],
    tone: "dark",
    background: ground(
      lin(160, [
        [0, C.ink],
        [1, C.midnight],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      photo(0.42, 0.46, 0.6, 0.72, { slot: "out-about", mask: "rounded", fit: "cover" }),
      text("Out\n&\nabout", 0.83, 0.4, {
        preset: "condensed",
        color: C.champagne,
        align: "center",
        size: 26,
        leading: 1.1,
        transform: "uppercase",
        tracking: 0.06,
      }),
      shape("line", 0.83, 0.6, 0.003, 0.12, { fill: C.champagne, opacity: 50 }),
      text("somewhere new", 0.83, 0.68, {
        preset: "minimal",
        color: C.blue,
        size: 9,
        tracking: 0.2,
        transform: "uppercase",
      }),
    ],
  }),

  /* 07 — Currently: a centred pill with micro-labels arranged around it. */
  tpl({
    id: "everyday-currently",
    name: "Currently",
    hint: "What I'm doing right now.",
    category: "everyday",
    tags: ["minimal", "text", "daily"],
    tone: "light",
    background: flat(C.cloud, INK_DARK),
    seeds: [
      shape("pill", 0.5, 0.46, 0.6, 0.1, { fill: C.ivory, stroke: C.grey, strokeWidth: 1 }),
      text("currently", 0.5, 0.46, {
        preset: "modern",
        color: C.ink,
        size: 17,
        tracking: 0.16,
        transform: "lowercase",
      }),
      text("reading", 0.24, 0.28, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.2,
        transform: "uppercase",
      }),
      text("listening", 0.76, 0.33, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.2,
        transform: "uppercase",
      }),
      text("feeling", 0.26, 0.64, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.2,
        transform: "uppercase",
      }),
      text("wanting", 0.74, 0.68, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.2,
        transform: "uppercase",
      }),
      shape("line", 0.5, 0.845, 0.24, 0.003, { fill: C.clay, opacity: 40 }),
    ],
  }),

  /* 08 — Today in Bloom: centred champagne ground, ring and fine type. */
  tpl({
    id: "everyday-today-in-bloom",
    name: "Today in Bloom",
    hint: "A quiet daily marker.",
    category: "everyday",
    tags: ["daily", "minimal", "brand"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.3, 0.9, 0.7, [
        [0, C.plum],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("ring", 0.5, 0.42, 0.34, 0.19, {
        stroke: C.champagne,
        strokeWidth: 1,
        fill: null,
        opacity: 60,
      }),
      text("Today", 0.5, 0.4, { preset: "elegant", color: C.champagne, size: 28 }),
      text("in bloom", 0.5, 0.465, {
        preset: "minimal",
        color: C.ivory,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
        opacity: 75,
      }),
      shape("star-4", 0.5, 0.62, 0.035, 0.02, { fill: C.champagne, opacity: 70 }),
    ],
  }),

  /* 09 — One Thing: near full-frame photo, a single sentence under it. */
  tpl({
    id: "everyday-one-thing",
    name: "One Thing",
    hint: "One photo and one thought.",
    category: "everyday",
    tags: ["photo", "minimal"],
    tone: "dark",
    background: flat(C.midnight, INK_LIGHT),
    seeds: [
      photo(0.5, 0.4, 0.92, 0.62, { slot: "one-thing", mask: "rect", fit: "cover" }),
      text("One thing from today", 0.5, 0.775, {
        preset: "editorial",
        color: C.ivory,
        size: 19,
        leading: 1.25,
      }),
      shape("underline-hand", 0.5, 0.815, 0.2, 0.012, { fill: C.rose, opacity: 65 }),
    ],
  }),

  /* 10 — Small Joy: warm radial glow, scalloped photo, fine rule. */
  tpl({
    id: "everyday-small-joy",
    name: "Small Joy",
    hint: "A tiny good thing, warmly lit.",
    category: "everyday",
    tags: ["warm", "photo", "gentle"],
    tone: "light",
    background: ground(
      rad(0.5, 0.25, 0.85, 0.6, [
        [0, C.butter],
        [1, C.peach],
      ]),
      INK_DARK,
    ),
    seeds: [
      photo(0.5, 0.44, 0.52, 0.44, { slot: "small-joy", mask: "scallop", fit: "cover" }),
      text("Small joy", 0.5, 0.73, {
        preset: "romantic",
        color: C.charcoal,
        size: 25,
      }),
      shape("rule-fade", 0.5, 0.79, 0.26, 0.003, { fill: C.terracotta, opacity: 45 }),
      text("found it today", 0.5, 0.835, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.22,
        transform: "lowercase",
      }),
    ],
  }),
];
