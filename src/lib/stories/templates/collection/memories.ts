/**
 * Memories — eight compositions for keeping something.
 *
 * These lean archival: film frames, tape, dates, negative space. The
 * temptation with memory templates is scrapbook clutter, so the discipline
 * here is that every one of them could lose an element and still work.
 */

import { photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const MEMORIES_TEMPLATES = [
  /* 11 — Keep This Moment: full-bleed image, type as small as it can be. */
  tpl({
    id: "memories-keep-this-moment",
    name: "Keep This Moment",
    hint: "The photo does all the talking.",
    category: "memories",
    tags: ["photo", "cinematic", "minimal"],
    tone: "dark",
    background: flat(C.obsidian, INK_LIGHT),
    seeds: [
      photo(0.5, 0.43, 1, 0.74, { slot: "keep-moment", fit: "cover", mask: "rect" }),
      shape("vignette", 0.5, 0.43, 1, 0.74, { fill: C.obsidian, opacity: 30 }),
      text("keep this moment", 0.5, 0.845, {
        preset: "whisper",
        color: C.ivory,
        size: 13,
        tracking: 0.08,
      }),
    ],
  }),

  /* 12 — A Memory Worth Keeping: two photos, one over the other. */
  tpl({
    id: "memories-worth-keeping",
    name: "A Memory Worth Keeping",
    hint: "Two photos, layered.",
    category: "memories",
    tags: ["photo", "editorial", "collage"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      photo(0.38, 0.38, 0.52, 0.4, {
        slot: "memory-back",
        mask: "rect",
        fit: "cover",
        rotation: -4,
        shadow: true,
      }),
      photo(0.62, 0.58, 0.5, 0.38, {
        slot: "memory-front",
        mask: "rect",
        fit: "cover",
        rotation: 3,
        shadow: true,
      }),
      text("a memory\nworth keeping", 0.5, 0.845, {
        preset: "editorial",
        color: C.charcoal,
        size: 17,
        leading: 1.2,
      }),
    ],
  }),

  /* 13 — From Today: date-led archival card, photo below the rule. */
  tpl({
    id: "memories-from-today",
    name: "From Today",
    hint: "Date first, photo second.",
    category: "memories",
    tags: ["date", "archive", "photo"],
    tone: "light",
    background: flat(C.cloud, INK_DARK),
    seeds: [
      text("From", 0.14, 0.16, {
        preset: "minimal",
        color: C.clay,
        align: "left",
        size: 10,
        tracking: 0.28,
        transform: "uppercase",
      }),
      text("Today", 0.14, 0.215, {
        preset: "display",
        color: C.ink,
        align: "left",
        size: 42,
      }),
      shape("line", 0.14, 0.27, 0.72, 0.003, { fill: C.ink, opacity: 25 }),
      photo(0.5, 0.575, 0.78, 0.5, { slot: "from-today", mask: "soft-corner", fit: "cover" }),
      text("filed away", 0.86, 0.855, {
        preset: "typewriter",
        color: C.clay,
        align: "right",
        size: 10,
      }),
    ],
  }),

  /* 14 — This Was Beautiful: dark ground, photo in a tall window. */
  tpl({
    id: "memories-this-was-beautiful",
    name: "This Was Beautiful",
    hint: "A tall frame on the dark.",
    category: "memories",
    tags: ["photo", "dark", "emotional"],
    tone: "dark",
    background: ground(
      lin(180, [
        [0, C.midnight],
        [1, C.plum],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      photo(0.5, 0.42, 0.56, 0.6, { slot: "was-beautiful", mask: "arch", fit: "cover" }),
      text("This was beautiful", 0.5, 0.8, {
        preset: "romantic",
        color: C.ivory,
        size: 22,
      }),
      shape("star-4", 0.5, 0.855, 0.028, 0.016, { fill: C.lavender, opacity: 60 }),
    ],
  }),

  /* 15 — Somewhere I Loved: wide photo strip, place name beneath. */
  tpl({
    id: "memories-somewhere-i-loved",
    name: "Somewhere I Loved",
    hint: "Wide photo, place name.",
    category: "memories",
    tags: ["travel", "photo", "memory"],
    tone: "dark",
    background: flat(C.forest, INK_LIGHT),
    seeds: [
      photo(0.5, 0.36, 0.86, 0.42, { slot: "somewhere", mask: "rounded", fit: "cover" }),
      text("Somewhere", 0.5, 0.635, {
        preset: "elegant",
        color: C.sage,
        size: 26,
      }),
      text("I loved", 0.5, 0.695, {
        preset: "elegant",
        color: C.ivory,
        size: 26,
        opacity: 80,
      }),
      shape("line", 0.5, 0.775, 0.16, 0.003, { fill: C.sage, opacity: 55 }),
      text("add the place", 0.5, 0.82, {
        preset: "minimal",
        color: C.mist,
        size: 9,
        tracking: 0.22,
        transform: "uppercase",
        opacity: 65,
      }),
    ],
  }),

  /* 16 — Remember This: near-empty. A frame, a word, a lot of air. */
  tpl({
    id: "memories-remember-this",
    name: "Remember This",
    hint: "Almost nothing on it. That's the point.",
    category: "memories",
    tags: ["minimal", "archive", "text"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      shape("rect", 0.5, 0.46, 0.62, 0.5, {
        fill: null,
        stroke: C.charcoal,
        strokeWidth: 1,
        opacity: 35,
      }),
      photo(0.5, 0.46, 0.54, 0.42, { slot: "remember-this", mask: "rect", fit: "cover" }),
      text("remember this", 0.5, 0.79, {
        preset: "typewriter",
        color: C.charcoal,
        size: 12,
        tracking: 0.18,
        transform: "lowercase",
      }),
    ],
  }),

  /* 17 — Little Archive: a clean vertical strip of three. */
  tpl({
    id: "memories-little-archive",
    name: "Little Archive",
    hint: "Three photos in a tidy column.",
    category: "memories",
    tags: ["collage", "photo", "archive"],
    tone: "light",
    background: flat(C.beige, INK_DARK),
    seeds: [
      text("little archive", 0.5, 0.145, {
        preset: "minimal",
        color: C.charcoal,
        size: 10,
        tracking: 0.28,
        transform: "uppercase",
      }),
      photo(0.5, 0.31, 0.66, 0.2, { slot: "archive-1", mask: "rect", fit: "cover" }),
      photo(0.5, 0.545, 0.66, 0.2, { slot: "archive-2", mask: "rect", fit: "cover" }),
      photo(0.5, 0.78, 0.66, 0.2, { slot: "archive-3", mask: "rect", fit: "cover" }),
      shape("line", 0.14, 0.425, 0.06, 0.003, { fill: C.charcoal, opacity: 30 }),
      shape("line", 0.14, 0.66, 0.06, 0.003, { fill: C.charcoal, opacity: 30 }),
    ],
  }),

  /* 18 — One For The Memory: polaroid, taped, slightly askew. */
  tpl({
    id: "memories-one-for-the-memory",
    name: "One For The Memory",
    hint: "A polaroid, taped down.",
    category: "memories",
    tags: ["polaroid", "photo", "scrapbook"],
    tone: "dark",
    background: ground(
      lin(180, [
        [0, C.ink],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("tape", 0.5, 0.245, 0.2, 0.05, { fill: C.ivory, opacity: 30, rotation: -6 }),
      photo(0.5, 0.48, 0.6, 0.5, {
        slot: "polaroid",
        mask: "rect",
        frame: "polaroid",
        frameColor: C.ivory,
        fit: "cover",
        rotation: -2.5,
        shadow: true,
      }),
      text("one for the memory", 0.5, 0.815, {
        preset: "handwritten",
        color: C.champagne,
        size: 17,
        rotation: -1.5,
      }),
    ],
  }),
];
