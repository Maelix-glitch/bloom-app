/**
 * Mood — seven compositions for how a day felt.
 *
 * Bloom's emotional colours are used the way weather is used in a painting:
 * a lavender wash, a sage field, a plum night. No emoji, no reaction-face
 * graphics, nothing that turns an honest check-in into a sticker.
 */

import { data, photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const MOOD_TEMPLATES = [
  /* 19 — Feeling Today: a single ring holding the word. */
  tpl({
    id: "mood-feeling-today",
    name: "Feeling Today",
    hint: "One word, held in a ring.",
    category: "mood",
    tags: ["mood", "minimal", "text"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.4, 0.9, 0.8, [
        [0, C.plum],
        [1, C.midnight],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("ring", 0.5, 0.44, 0.5, 0.28, {
        stroke: C.rose,
        strokeWidth: 1.5,
        fill: null,
        opacity: 55,
      }),
      text("feeling", 0.5, 0.4, {
        preset: "minimal",
        color: C.mist,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      text("today", 0.5, 0.465, { preset: "editorial", color: C.ivory, size: 26 }),
      shape("circle", 0.5, 0.545, 0.014, 0.008, { fill: C.rose, opacity: 80 }),
    ],
  }),

  /* 20 — Inner Weather: a soft field with a horizon line. */
  tpl({
    id: "mood-inner-weather",
    name: "Inner Weather",
    hint: "Atmospheric, like a sky.",
    category: "mood",
    tags: ["mood", "atmospheric", "soft"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.lavender],
        [0.55, C.cloud],
        [1, C.mist],
      ]),
      INK_DARK,
    ),
    seeds: [
      shape("line", 0.5, 0.56, 0.9, 0.002, { fill: C.ivory, opacity: 60 }),
      text("inner\nweather", 0.5, 0.36, {
        preset: "elegant",
        color: C.ink,
        size: 30,
        leading: 1.15,
      }),
      text("what it felt like in there", 0.5, 0.63, {
        preset: "whisper",
        color: C.ink,
        size: 12,
        opacity: 70,
      }),
      shape("cloud", 0.72, 0.24, 0.14, 0.06, { fill: C.ivory, opacity: 45 }),
    ],
  }),

  /* 21 — A Quiet Day: heavy negative space, one small line. */
  tpl({
    id: "mood-a-quiet-day",
    name: "A Quiet Day",
    hint: "Mostly empty. Deliberately.",
    category: "mood",
    tags: ["mood", "minimal", "quiet"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      shape("line", 0.5, 0.47, 0.003, 0.16, { fill: C.clay, opacity: 40 }),
      text("a quiet day", 0.5, 0.6, {
        preset: "soft",
        color: C.charcoal,
        size: 20,
        tracking: 0.04,
      }),
    ],
  }),

  /* 22 — My Energy: the real Bloom reading, no invented numbers. */
  tpl({
    id: "mood-my-energy",
    name: "My Energy",
    hint: "Uses your real energy reading.",
    category: "mood",
    tags: ["mood", "data", "energy"],
    tone: "dark",
    background: flat(C.midnight, INK_LIGHT),
    seeds: [
      text("my energy", 0.5, 0.22, {
        preset: "minimal",
        color: C.champagne,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      data("energy", 0.5, 0.46, { variant: "ring", w: 0.4, h: 0.24, accent: C.champagne }),
      text("today, honestly", 0.5, 0.66, {
        preset: "whisper",
        color: C.grey,
        size: 12,
      }),
    ],
  }),

  /* 23 — Today Felt Like: poetic type over a deep wash. */
  tpl({
    id: "mood-today-felt-like",
    name: "Today Felt Like",
    hint: "Finish the sentence.",
    category: "mood",
    tags: ["mood", "text", "editorial"],
    tone: "dark",
    background: ground(
      lin(150, [
        [0, C.forest],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      text("today\nfelt like", 0.5, 0.3, {
        preset: "editorial",
        color: C.sage,
        size: 32,
        leading: 1.08,
      }),
      shape("underline-hand", 0.5, 0.435, 0.42, 0.014, { fill: C.sage, opacity: 45 }),
      text("…", 0.5, 0.56, { preset: "handwritten", color: C.ivory, size: 34, opacity: 60 }),
      text("write it here", 0.5, 0.68, {
        preset: "minimal",
        color: C.mist,
        size: 9,
        tracking: 0.24,
        transform: "uppercase",
        opacity: 55,
      }),
    ],
  }),

  /* 24 — A Moment I Needed: photo in a leaf mask, caption tucked low. */
  tpl({
    id: "mood-a-moment-i-needed",
    name: "A Moment I Needed",
    hint: "One photo, softly shaped.",
    category: "mood",
    tags: ["mood", "photo", "reflective"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.peach],
        [1, C.ivory],
      ]),
      INK_DARK,
    ),
    seeds: [
      photo(0.5, 0.43, 0.58, 0.5, { slot: "moment-needed", mask: "leaf", fit: "cover" }),
      text("a moment I needed", 0.5, 0.765, {
        preset: "romantic",
        color: C.charcoal,
        size: 19,
      }),
      shape("petal", 0.5, 0.825, 0.03, 0.02, { fill: C.terracotta, opacity: 50 }),
    ],
  }),

  /* 25 — Mood In Bloom: concentric arcs, the signature emotional card. */
  tpl({
    id: "mood-in-bloom",
    name: "Mood In Bloom",
    hint: "Concentric arcs, one feeling.",
    category: "mood",
    tags: ["mood", "brand", "minimal"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.55, 1, 0.9, [
        [0, C.midnight],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("arc", 0.5, 0.62, 0.78, 0.44, {
        stroke: C.lavender,
        strokeWidth: 1,
        fill: null,
        opacity: 35,
      }),
      shape("arc", 0.5, 0.62, 0.58, 0.33, {
        stroke: C.rose,
        strokeWidth: 1,
        fill: null,
        opacity: 45,
      }),
      shape("arc", 0.5, 0.62, 0.38, 0.22, {
        stroke: C.champagne,
        strokeWidth: 1,
        fill: null,
        opacity: 55,
      }),
      text("mood", 0.5, 0.44, {
        preset: "display",
        color: C.ivory,
        size: 30,
        tracking: 0.02,
      }),
      text("in bloom", 0.5, 0.505, {
        preset: "minimal",
        color: C.lavender,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
    ],
  }),
];
