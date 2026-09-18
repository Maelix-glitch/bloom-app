/**
 * Wellness — six compositions for looking after yourself.
 *
 * Lifestyle, not clinical. Nothing here makes a health claim, promises an
 * outcome, or implies Bloom measured something it didn't. Where a template
 * shows a number, it shows a real logged reading and prints an honest empty
 * state when there isn't one.
 */

import { data, photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const WELLNESS_TEMPLATES = [
  /* 33 — Took Care Of Myself: warm ground, generous air. */
  tpl({
    id: "wellness-took-care-of-myself",
    name: "Took Care Of Myself",
    hint: "A gentle marker for a self-care day.",
    category: "wellness",
    tags: ["wellness", "self care", "warm"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.peach],
        [1, C.ivory],
      ]),
      INK_DARK,
    ),
    seeds: [
      shape("leaf", 0.5, 0.3, 0.06, 0.05, { fill: C.moss, opacity: 45 }),
      text("took care\nof myself", 0.5, 0.45, {
        preset: "elegant",
        color: C.charcoal,
        size: 27,
        leading: 1.15,
      }),
      text("today", 0.5, 0.565, {
        preset: "minimal",
        color: C.terracotta,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      shape("rule-fade", 0.5, 0.64, 0.24, 0.003, { fill: C.terracotta, opacity: 40 }),
    ],
  }),

  /* 34 — Rested: dark, low-contrast, made for the end of the day. */
  tpl({
    id: "wellness-rested",
    name: "Rested",
    hint: "Sleep-friendly, easy on the eyes.",
    category: "wellness",
    tags: ["wellness", "sleep", "night"],
    tone: "dark",
    background: ground(
      lin(180, [
        [0, C.ink],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("moon", 0.72, 0.24, 0.07, 0.05, { fill: C.mist, opacity: 40 }),
      text("Rested", 0.5, 0.44, { preset: "soft", color: C.mist, size: 32, tracking: 0.06 }),
      text("and that's enough", 0.5, 0.52, {
        preset: "whisper",
        color: C.blue,
        size: 12,
        opacity: 75,
      }),
      shape("line", 0.5, 0.6, 0.18, 0.002, { fill: C.mist, opacity: 25 }),
    ],
  }),

  /* 35 — Moved Today: real movement reading, no invented distance. */
  tpl({
    id: "wellness-moved-today",
    name: "Moved Today",
    hint: "Uses your real movement log.",
    category: "wellness",
    tags: ["wellness", "movement", "data"],
    tone: "dark",
    background: flat(C.forest, INK_LIGHT),
    seeds: [
      text("moved today", 0.5, 0.23, {
        preset: "minimal",
        color: C.sage,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      data("movement", 0.5, 0.46, { variant: "card", w: 0.56, h: 0.26, accent: C.sage }),
      shape("arc", 0.5, 0.78, 0.5, 0.14, {
        stroke: C.sage,
        strokeWidth: 1,
        fill: null,
        opacity: 40,
      }),
      text("body said yes", 0.5, 0.7, {
        preset: "whisper",
        color: C.ivory,
        size: 12,
        opacity: 70,
      }),
    ],
  }),

  /* 36 — Hydrated: a single glass-shaped form, mostly water-coloured air. */
  tpl({
    id: "wellness-hydrated",
    name: "Hydrated",
    hint: "Uses your real water log.",
    category: "wellness",
    tags: ["wellness", "hydration", "minimal"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.cloud],
        [1, C.mist],
      ]),
      INK_DARK,
    ),
    seeds: [
      shape("arch-inverted", 0.5, 0.42, 0.26, 0.34, { fill: C.blue, opacity: 35 }),
      text("hydrated", 0.5, 0.42, {
        preset: "modern",
        color: C.ink,
        size: 19,
        tracking: 0.1,
        transform: "lowercase",
      }),
      data("water", 0.5, 0.66, { variant: "inline", accent: C.ink }),
    ],
  }),

  /* 37 — A Better Habit: numbered steps, editorial and plain. */
  tpl({
    id: "wellness-a-better-habit",
    name: "A Better Habit",
    hint: "For the habit you're building.",
    category: "wellness",
    tags: ["wellness", "habits", "editorial"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      text("a better habit", 0.14, 0.19, {
        preset: "display",
        color: C.charcoal,
        align: "left",
        size: 30,
      }),
      shape("line", 0.14, 0.25, 0.72, 0.003, { fill: C.charcoal, opacity: 25 }),
      text("01", 0.16, 0.36, {
        preset: "typewriter",
        color: C.terracotta,
        align: "left",
        size: 12,
      }),
      text("start smaller", 0.28, 0.36, {
        preset: "soft",
        color: C.charcoal,
        align: "left",
        size: 14,
      }),
      text("02", 0.16, 0.45, {
        preset: "typewriter",
        color: C.terracotta,
        align: "left",
        size: 12,
      }),
      text("same time each day", 0.28, 0.45, {
        preset: "soft",
        color: C.charcoal,
        align: "left",
        size: 14,
      }),
      text("03", 0.16, 0.54, {
        preset: "typewriter",
        color: C.terracotta,
        align: "left",
        size: 12,
      }),
      text("let it be boring", 0.28, 0.54, {
        preset: "soft",
        color: C.charcoal,
        align: "left",
        size: 14,
      }),
      shape("line", 0.14, 0.63, 0.72, 0.003, { fill: C.charcoal, opacity: 15 }),
    ],
  }),

  /* 38 — Feeling Better: soft radial, one honest sentence. */
  tpl({
    id: "wellness-feeling-better",
    name: "Feeling Better",
    hint: "For a day that turned.",
    category: "wellness",
    tags: ["wellness", "gentle", "warm"],
    tone: "light",
    background: ground(
      rad(0.5, 0.35, 0.9, 0.7, [
        [0, C.butter],
        [1, C.ivory],
      ]),
      INK_DARK,
    ),
    seeds: [
      photo(0.5, 0.4, 0.5, 0.36, { slot: "feeling-better", mask: "circle", fit: "cover" }),
      text("feeling better", 0.5, 0.665, {
        preset: "romantic",
        color: C.charcoal,
        size: 23,
      }),
      text("slowly counts too", 0.5, 0.725, {
        preset: "whisper",
        color: C.clay,
        size: 12,
      }),
    ],
  }),
];
