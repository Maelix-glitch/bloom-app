/**
 * Progress — seven compositions for getting somewhere.
 *
 * The brief for this shelf was explicit: emotionally rewarding, not a game
 * reward card. So no confetti, no badges, no score. A win here is stated
 * plainly and given room, the way you'd tell a friend.
 */

import { data, photo, shape, text, tpl } from "../dsl";
import { C, flat, ground, INK_DARK, INK_LIGHT, lin, rad } from "./kit";

export const PROGRESS_TEMPLATES = [
  /* 26 — Small Win: a single sentence, underlined once. */
  tpl({
    id: "progress-small-win",
    name: "Small Win",
    hint: "Say the thing you did.",
    category: "progress",
    tags: ["progress", "win", "text"],
    tone: "light",
    background: flat(C.ivory, INK_DARK),
    seeds: [
      text("small win", 0.5, 0.3, {
        preset: "minimal",
        color: C.clay,
        size: 10,
        tracking: 0.3,
        transform: "uppercase",
      }),
      text("I did the thing", 0.5, 0.43, {
        preset: "editorial",
        color: C.charcoal,
        size: 26,
        leading: 1.15,
      }),
      shape("underline-hand", 0.5, 0.5, 0.36, 0.014, { fill: C.sage, opacity: 70 }),
      text("and that counts", 0.5, 0.6, { preset: "soft", color: C.clay, size: 13 }),
    ],
  }),

  /* 27 — I Kept Going: a row of small marks, like a tally. */
  tpl({
    id: "progress-i-kept-going",
    name: "I Kept Going",
    hint: "Consistency, shown quietly.",
    category: "progress",
    tags: ["progress", "habits", "consistency"],
    tone: "dark",
    background: flat(C.forest, INK_LIGHT),
    seeds: [
      text("I kept\ngoing", 0.5, 0.32, {
        preset: "display",
        color: C.ivory,
        size: 34,
        leading: 1.05,
      }),
      shape("dots-row", 0.5, 0.5, 0.46, 0.02, { fill: C.sage, opacity: 75 }),
      text("day after day after day", 0.5, 0.575, {
        preset: "minimal",
        color: C.sage,
        size: 10,
        tracking: 0.22,
        transform: "lowercase",
      }),
      data("streak", 0.5, 0.7, { variant: "inline", accent: C.champagne }),
    ],
  }),

  /* 28 — One Step Forward: an arrow drawn by hand, nothing else. */
  tpl({
    id: "progress-one-step-forward",
    name: "One Step Forward",
    hint: "Just the direction.",
    category: "progress",
    tags: ["progress", "minimal", "growth"],
    tone: "light",
    background: flat(C.cloud, INK_DARK),
    seeds: [
      shape("arrow-hand", 0.5, 0.42, 0.4, 0.05, { stroke: C.ink, strokeWidth: 1.5, fill: null }),
      text("one step forward", 0.5, 0.56, {
        preset: "modern",
        color: C.ink,
        size: 18,
        tracking: 0.02,
      }),
      text("that's the whole thing", 0.5, 0.615, {
        preset: "whisper",
        color: C.clay,
        size: 12,
      }),
    ],
  }),

  /* 29 — Proud Of This: photo with the words set over the bottom third. */
  tpl({
    id: "progress-proud-of-this",
    name: "Proud Of This",
    hint: "Show it, then say it.",
    category: "progress",
    tags: ["progress", "photo", "proud"],
    tone: "dark",
    background: flat(C.obsidian, INK_LIGHT),
    seeds: [
      photo(0.5, 0.38, 0.9, 0.6, { slot: "proud", mask: "rounded", fit: "cover" }),
      shape("vignette", 0.5, 0.55, 0.9, 0.3, { fill: C.obsidian, opacity: 55 }),
      text("proud of this", 0.5, 0.62, {
        preset: "bold",
        color: C.ivory,
        size: 24,
        tracking: 0.01,
      }),
      text("no small thing", 0.5, 0.675, {
        preset: "minimal",
        color: C.champagne,
        size: 10,
        tracking: 0.24,
        transform: "uppercase",
      }),
    ],
  }),

  /* 30 — Today I Showed Up: habit data, honest about a missing day. */
  tpl({
    id: "progress-today-i-showed-up",
    name: "Today I Showed Up",
    hint: "Uses your real habit data.",
    category: "progress",
    tags: ["progress", "habits", "data"],
    tone: "light",
    background: ground(
      lin(180, [
        [0, C.ivory],
        [1, C.butter],
      ]),
      INK_DARK,
    ),
    seeds: [
      text("today I showed up", 0.5, 0.24, {
        preset: "editorial",
        color: C.charcoal,
        size: 22,
      }),
      shape("line", 0.5, 0.3, 0.2, 0.003, { fill: C.terracotta, opacity: 50 }),
      data("habits", 0.5, 0.5, { variant: "list", w: 0.6, h: 0.3, accent: C.moss }),
      text("whatever that looked like", 0.5, 0.72, {
        preset: "whisper",
        color: C.clay,
        size: 12,
      }),
    ],
  }),

  /* 31 — Progress Looks Like This: photo first, words small at the top. */
  tpl({
    id: "progress-looks-like-this",
    name: "Progress Looks Like This",
    hint: "Let the picture carry it.",
    category: "progress",
    tags: ["progress", "photo", "visual"],
    tone: "dark",
    background: flat(C.midnight, INK_LIGHT),
    seeds: [
      text("progress looks like this", 0.5, 0.16, {
        preset: "minimal",
        color: C.mist,
        size: 10,
        tracking: 0.26,
        transform: "uppercase",
      }),
      photo(0.5, 0.53, 0.84, 0.62, { slot: "progress-photo", mask: "rect", fit: "cover" }),
      shape("corner-mark", 0.13, 0.24, 0.06, 0.04, {
        stroke: C.champagne,
        strokeWidth: 1,
        fill: null,
        opacity: 60,
      }),
    ],
  }),

  /* 32 — Blooming: the milestone card — a ring opening outward. */
  tpl({
    id: "progress-blooming",
    name: "Blooming",
    hint: "A milestone, without the fanfare.",
    category: "progress",
    tags: ["progress", "milestone", "brand"],
    tone: "dark",
    background: ground(
      rad(0.5, 0.45, 0.95, 0.85, [
        [0, C.plum],
        [1, C.obsidian],
      ]),
      INK_LIGHT,
    ),
    seeds: [
      shape("ring", 0.5, 0.44, 0.46, 0.26, {
        stroke: C.champagne,
        strokeWidth: 1,
        fill: null,
        opacity: 70,
      }),
      shape("ring", 0.5, 0.44, 0.6, 0.34, {
        stroke: C.rose,
        strokeWidth: 1,
        fill: null,
        opacity: 35,
      }),
      text("Blooming", 0.5, 0.435, { preset: "elegant", color: C.champagne, size: 28 }),
      text("a milestone, quietly reached", 0.5, 0.5, {
        preset: "minimal",
        color: C.ivory,
        size: 9,
        tracking: 0.22,
        transform: "uppercase",
        opacity: 70,
      }),
      shape("star-4", 0.5, 0.63, 0.032, 0.018, { fill: C.champagne, opacity: 65 }),
    ],
  }),
];
