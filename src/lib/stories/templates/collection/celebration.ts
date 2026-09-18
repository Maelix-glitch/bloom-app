/**
 * Celebration — six compositions for a good thing.
 *
 * Sophisticated, not loud. No confetti field, no party graphics, no exclamation
 * marks doing the work that spacing should do. A celebration here is something
 * you'd be happy to look at again in a year.
 */

import { photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const CELEBRATION_TEMPLATES = [
  /* 45 — We Did It: two names, one thin rule between them. */
  tpl({
    id: "celebration-we-did-it",
    name: "We Did It",
    hint: "For something you didn't do alone.",
    category: "celebration",
    tags: ["celebration", "shared", "warm"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.4, 0.95, 0.8, [
        [0, C.plum],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      text("we", 0.5, 0.36, { preset: "elegant", color: C.ivory, size: 30 }),
      shape("line", 0.5, 0.44, 0.2, 0.002, { fill: C.champagne, opacity: 60 }),
      text("did it", 0.5, 0.53, { preset: "elegant", color: C.champagne, size: 30 }),
      shape("star-4", 0.32, 0.3, 0.022, 0.013, { fill: C.champagne, opacity: 55 }),
      shape("star-4", 0.68, 0.6, 0.018, 0.011, { fill: C.rose, opacity: 55 }),
    ],
  }),

  /* 46 — Worth Celebrating: champagne field, arch of photo. */
  tpl({
    id: "celebration-worth-celebrating",
    name: "Worth Celebrating",
    hint: "Elegant, photo-led.",
    category: "celebration",
    tags: ["celebration", "photo", "elegant"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.champagne],
        [1, C.ivory],
      ]),
      INK_DARK,
    ),
    seeds: [
      photo(0.5, 0.42, 0.54, 0.44, { slot: "worth-celebrating", mask: "arch", fit: "cover" }),
      text("worth celebrating", 0.5, 0.735, {
        preset: "editorial",
        color: C.charcoal,
        size: 21,
      }),
      shape("rule-fade", 0.5, 0.795, 0.28, 0.003, { fill: C.terracotta, opacity: 50 }),
    ],
  }),

  /* 47 — Bloom Moment: the signature mark, restrained. */
  tpl({
    id: "celebration-bloom-moment",
    name: "Bloom Moment",
    hint: "The signature one.",
    category: "celebration",
    tags: ["celebration", "brand", "minimal"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.5, 1, 0.9, [
        [0, C.midnight],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("petal", 0.5, 0.34, 0.09, 0.07, { fill: C.rose, opacity: 55 }),
      shape("petal", 0.42, 0.39, 0.07, 0.055, { fill: C.lavender, opacity: 45, rotation: -35 }),
      shape("petal", 0.58, 0.39, 0.07, 0.055, { fill: C.champagne, opacity: 45, rotation: 35 }),
      text("a bloom\nmoment", 0.5, 0.55, {
        preset: "display",
        color: C.ivory,
        size: 28,
        leading: 1.1,
      }),
      text("mark it", 0.5, 0.665, {
        preset: "minimal",
        color: C.champagne,
        size: 9,
        tracking: 0.3,
        transform: "uppercase",
      }),
    ],
  }),

  /* 48 — A Good Day: full-bleed photo, one word bottom-left. */
  tpl({
    id: "celebration-a-good-day",
    name: "A Good Day",
    hint: "Photo, and one word.",
    category: "celebration",
    tags: ["celebration", "photo", "warm"],
    tone: "dark",
    background: flat(C.obsidian, INK_LIGHT),
    seeds: [
      photo(0.5, 0.44, 1, 0.8, { slot: "good-day", mask: "rect", fit: "cover" }),
      shape("vignette", 0.5, 0.72, 1, 0.3, { fill: C.obsidian, opacity: 60 }),
      text("a good day", 0.14, 0.845, {
        preset: "handwritten",
        color: C.ivory,
        align: "left",
        size: 21,
      }),
    ],
  }),

  /* 49 — Made Me Smile: bright, off-centre, deliberately light-hearted. */
  tpl({
    id: "celebration-made-me-smile",
    name: "Made Me Smile",
    hint: "The cheerful one, without being loud.",
    category: "celebration",
    tags: ["celebration", "joy", "photo"],
    tone: "light",
    background: ground(
      lin(140, [
        [0, C.butter],
        [1, C.peach],
      ]),
      INK_DARK,
    ),
    seeds: [
      photo(0.56, 0.45, 0.5, 0.42, {
        slot: "made-me-smile",
        mask: "blob",
        fit: "cover",
        rotation: 3,
      }),
      text("made\nme\nsmile", 0.24, 0.42, {
        preset: "poster",
        color: C.charcoal,
        align: "left",
        size: 22,
        leading: 1.05,
      }),
      shape("sparkle", 0.78, 0.72, 0.05, 0.03, { fill: C.ivory, opacity: 70 }),
      shape("sparkle", 0.16, 0.66, 0.035, 0.022, { fill: C.terracotta, opacity: 50 }),
    ],
  }),

  /* 50 — Remember This Feeling: dark, one line, a lot of held breath. */
  tpl({
    id: "celebration-remember-this-feeling",
    name: "Remember This Feeling",
    hint: "For the ones you want to keep.",
    category: "celebration",
    tags: ["celebration", "emotional", "minimal"],
    tone: "dark",
    background: ground(
      lin(180, [
        [0, C.plum],
        [1, C.midnight],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("glow", 0.5, 0.42, 0.7, 0.4, { fill: C.rose, opacity: 18 }),
      text("remember\nthis feeling", 0.5, 0.44, {
        preset: "romantic",
        color: C.ivory,
        size: 27,
        leading: 1.2,
      }),
      shape("line", 0.5, 0.575, 0.16, 0.002, { fill: C.champagne, opacity: 55 }),
      text("so you can come back to it", 0.5, 0.63, {
        preset: "whisper",
        color: C.mist,
        size: 11,
        opacity: 70,
      }),
    ],
  }),
];
