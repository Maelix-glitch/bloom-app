/**
 * Reflection — six compositions for thinking something over.
 *
 * Quiet by design. These are the templates someone reaches for at the end of
 * a day, so they hold a lot of empty space and never shout. The type does the
 * work; nothing decorates it.
 */

import { photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const REFLECTION_TEMPLATES = [
  /* 39 — Grateful For: three blank lines to fill in. */
  tpl({
    id: "reflection-grateful-for",
    name: "Grateful For",
    hint: "Three lines, nothing more.",
    category: "reflection",
    tags: ["reflection", "gratitude", "minimal"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      text("grateful for", 0.5, 0.2, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      shape("line", 0.5, 0.36, 0.6, 0.002, { fill: C.charcoal, opacity: 25 }),
      shape("line", 0.5, 0.5, 0.6, 0.002, { fill: C.charcoal, opacity: 25 }),
      shape("line", 0.5, 0.64, 0.6, 0.002, { fill: C.charcoal, opacity: 25 }),
      shape("star-4", 0.5, 0.775, 0.028, 0.016, { fill: C.champagne, opacity: 80 }),
    ],
  }),

  /* 40 — Something I Learned: large quote marks, editorial type. */
  tpl({
    id: "reflection-something-i-learned",
    name: "Something I Learned",
    hint: "One idea, set large.",
    category: "reflection",
    tags: ["reflection", "study", "text"],
    tone: "dark",
    background: ground(
      lin(180, [
        [0, C.ink],
        [1, C.midnight],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      text("“", 0.2, 0.24, { preset: "editorial", color: C.champagne, size: 72, opacity: 55 }),
      text("something\nI learned", 0.5, 0.44, {
        preset: "editorial",
        color: C.ivory,
        size: 28,
        leading: 1.15,
      }),
      shape("line", 0.5, 0.575, 0.14, 0.003, { fill: C.champagne, opacity: 50 }),
      text("today", 0.5, 0.63, {
        preset: "minimal",
        color: C.mist,
        size: 10,
        tracking: 0.28,
        transform: "uppercase",
      }),
    ],
  }),

  /* 41 — What Stayed With Me: photo, faded, with words over it. */
  tpl({
    id: "reflection-what-stayed-with-me",
    name: "What Stayed With Me",
    hint: "A faded photo under a thought.",
    category: "reflection",
    tags: ["reflection", "photo", "memory"],
    tone: "dark",
    background: flat(C.midnight, INK_LIGHT),
    seeds: [
      photo(0.5, 0.44, 1, 0.76, {
        slot: "stayed-with-me",
        mask: "rect",
        fit: "cover",
        opacity: 55,
        filterId: "fade",
      }),
      shape("vignette", 0.5, 0.44, 1, 0.76, { fill: C.midnight, opacity: 45 }),
      text("what stayed\nwith me", 0.5, 0.44, {
        preset: "soft",
        color: C.ivory,
        size: 26,
        leading: 1.2,
        shadow: true,
      }),
    ],
  }),

  /* 42 — A Thought To Keep: pure typography, framed by two hairlines. */
  tpl({
    id: "reflection-a-thought-to-keep",
    name: "A Thought To Keep",
    hint: "Words only. No photo needed.",
    category: "reflection",
    tags: ["reflection", "text", "typography"],
    tone: "light",
    background: flat(C.cloud, INK_DARK),
    seeds: [
      shape("line", 0.5, 0.26, 0.5, 0.002, { fill: C.ink, opacity: 30 }),
      text("a thought\nto keep", 0.5, 0.43, {
        preset: "classic",
        color: C.ink,
        size: 30,
        leading: 1.15,
      }),
      shape("line", 0.5, 0.6, 0.5, 0.002, { fill: C.ink, opacity: 30 }),
      text("write it down before it goes", 0.5, 0.68, {
        preset: "whisper",
        color: C.clay,
        size: 11,
      }),
    ],
  }),

  /* 43 — Today Taught Me: split ground, type on one side. */
  tpl({
    id: "reflection-today-taught-me",
    name: "Today Taught Me",
    hint: "Split ground, words to one side.",
    category: "reflection",
    tags: ["reflection", "editorial", "text"],
    tone: "light",
    background: ground(
      lin(90, [
        [0, C.sage],
        [0.42, C.sage],
        [0.42, C.ivory],
        [1, C.ivory],
      ]),
      INK_DARK,
    ),
    seeds: [
      text("today\ntaught\nme", 0.21, 0.42, {
        preset: "condensed",
        color: C.ivory,
        align: "center",
        size: 24,
        leading: 1.1,
        transform: "uppercase",
        tracking: 0.04,
      }),
      text("…", 0.7, 0.45, { preset: "handwritten", color: C.charcoal, size: 30, opacity: 45 }),
      shape("line", 0.7, 0.55, 0.34, 0.002, { fill: C.charcoal, opacity: 20 }),
    ],
  }),

  /* 44 — For Future Me: journal page, ruled, dated at the top. */
  tpl({
    id: "reflection-for-future-me",
    name: "For Future Me",
    hint: "A journal page to come back to.",
    category: "reflection",
    tags: ["reflection", "journal", "text"],
    tone: "light",
    background: flat(C.butter, INK_DARK),
    seeds: [
      shape("rect", 0.5, 0.47, 0.78, 0.66, { fill: C.ivory, opacity: 70 }),
      text("for future me", 0.5, 0.215, {
        preset: "handwritten",
        color: C.charcoal,
        size: 20,
      }),
      shape("line", 0.5, 0.35, 0.6, 0.002, { fill: C.clay, opacity: 35 }),
      shape("line", 0.5, 0.45, 0.6, 0.002, { fill: C.clay, opacity: 35 }),
      shape("line", 0.5, 0.55, 0.6, 0.002, { fill: C.clay, opacity: 35 }),
      shape("line", 0.5, 0.65, 0.6, 0.002, { fill: C.clay, opacity: 35 }),
      text("dated today", 0.5, 0.775, {
        preset: "typewriter",
        color: C.clay,
        size: 9,
        tracking: 0.14,
      }),
    ],
  }),
];
